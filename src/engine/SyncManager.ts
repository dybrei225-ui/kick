/**
 * KICK ANALYTICS MX — SYNC MANAGER & TRANSACTIONAL INGESTION (Fase 4, Reqs 43, 44, 45, 51, 52)
 * Principio transaccional estricto:
 * READ → VALIDATE → PREPARE → PREVIEW → CONFIRM → COMMIT
 * Permite previsualización, detección de colisiones de snapshots, fusión explícita,
 * registro de trabajos (ImportJob), logs de cambios (ChangeLog) y Rollback sin pérdida de históricos.
 */

import {
  Streamer,
  ChannelSnapshot,
  ImportJob,
  ChangeLogEntry,
  StreamerDiffItem,
  SnapshotDuplicateConflict,
  AuditActionLog,
  SourceType,
  MetricDataType,
} from '../types';
import { ChangeDetector } from './ChangeDetector';
import { Validator } from './Validator';
import { Normalizer } from './Normalizer';
import { Deduplicator } from './Deduplicator';
import { appStorage } from '../adapters/storage/StorageAdapter';

export interface IngestionPreviewResult {
  jobId: string;
  totalRecords: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  errorCount: number;
  errors: string[];
  warnings: string[];
  diffs: StreamerDiffItem[];
  logEntries: ChangeLogEntry[];
  snapshotConflicts: SnapshotDuplicateConflict[];
  preparedStreamers: Streamer[];
  preparedSnapshots: ChannelSnapshot[];
  isDemoData: boolean;
  sourceType: SourceType;
  sourceName: string;
}

const IMPORT_JOBS_KEY = 'kick_analytics_mx_import_jobs_v1';
const CHANGE_LOGS_KEY = 'kick_analytics_mx_change_logs_v1';
const AUDIT_ACTIONS_KEY = 'kick_analytics_mx_audit_actions_v1';

export class SyncManager {
  private static instance: SyncManager;

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Fase PREVIEW: Analiza y prepara sin escribir en la base de datos
   */
  public async preview(
    incomingStreamers: Partial<Streamer>[],
    incomingSnapshots: Partial<ChannelSnapshot>[],
    existingStreamers: Streamer[],
    existingSnapshots: ChannelSnapshot[],
    options: {
      sourceType: SourceType;
      sourceName: string;
      sourceUrl?: string;
      isDemo?: boolean;
    }
  ): Promise<IngestionPreviewResult> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validar y normalizar streamers
    const validStreamers: Streamer[] = [];
    for (let i = 0; i < incomingStreamers.length; i++) {
      const raw = incomingStreamers[i];
      const valRes = Validator.validateStreamer(raw);
      if (!valRes.isValid) {
        errors.push(`Registro #${i + 1} (${raw.username || 'sin @'}): ${valRes.errors.join('; ')}`);
        continue;
      }
      if (valRes.warnings.length > 0) {
        warnings.push(...valRes.warnings);
      }
      const norm = valRes.normalizedData as Streamer;
      if (options.isDemo) {
        norm.isDemo = true;
      }
      validStreamers.push(norm);
    }

    // 2. Detectar cambios y diffs
    const batchChangeRes = ChangeDetector.detectBatchChanges(existingStreamers, validStreamers, jobId);

    // 3. Validar snapshots y detectar colisiones (Requerimiento 11)
    const validSnapshots: ChannelSnapshot[] = [];
    const snapshotConflicts: SnapshotDuplicateConflict[] = [];

    for (let i = 0; i < incomingSnapshots.length; i++) {
      const rawSnap = incomingSnapshots[i];
      const snapVal = Validator.validateSnapshot(rawSnap);
      if (!snapVal.isValid || !snapVal.normalizedSnapshot) {
        errors.push(`Snapshot #${i + 1}: ${snapVal.errors.join('; ')}`);
        continue;
      }
      const normSnap = snapVal.normalizedSnapshot;
      if (options.isDemo) {
        normSnap.isDemo = true;
      }

      // Buscar si ya existe snapshot con el mismo streamerId y misma fecha
      const snapUser = (normSnap.streamerUsername || '').toLowerCase();
      const existingConflict = existingSnapshots.find(
        (s) =>
          (s.streamerId === normSnap.streamerId ||
            (s.streamerUsername && s.streamerUsername.toLowerCase() === snapUser)) &&
          s.date === normSnap.date
      );

      if (existingConflict) {
        const cUser = normSnap.streamerUsername || normSnap.streamerId;
        snapshotConflicts.push({
          id: `conflict-${cUser}-${normSnap.date}`,
          username: cUser,
          date: normSnap.date,
          existingSnapshot: existingConflict,
          incomingSnapshot: normSnap,
          existingSource: existingConflict.source,
          newSource: normSnap.source || options.sourceName,
        });
      } else {
        validSnapshots.push(normSnap);
      }
    }

    // 4. Si vienen streamers sin snapshots explícitos, generar snapshot automático de ingesta (Requerimiento 10)
    const today = new Date().toISOString().split('T')[0];
    for (const st of validStreamers) {
      const stUser = (st.username || '').toLowerCase();
      // Verificar si ya se preparó un snapshot para este canal hoy
      const hasSnapToday = validSnapshots.some(
        (s) => (s.streamerUsername || '').toLowerCase() === stUser && s.date === today
      );
      if (!hasSnapToday) {
        // Verificar si existe conflicto con snapshot existente de hoy
        const existingToday = existingSnapshots.find(
          (s) => (s.streamerUsername || '').toLowerCase() === stUser && s.date === today
        );
        const autoSnap: ChannelSnapshot = {
          id: `snap-auto-${st.username}-${today}`,
          streamerId: st.id,
          streamerUsername: st.username,
          streamerDisplayName: st.displayName,
          date: today,
          period: 'Diario',
          followers: st.followers?.value ?? 0,
          avgViewers: st.avgViewers?.value ?? 0,
          peakViewers: st.peakViewers?.value ?? 0,
          hoursStreamed: st.hoursStreamed?.value ?? 0,
          streamCount: st.streamCount?.value ?? 0,
          category: st.primaryCategory || 'General',
          source: options.sourceName,
          dataType: options.isDemo ? 'demo_generated' : options.sourceType === 'MANUAL' ? 'manual_audit' : 'observed_counter',
          isDemo: options.isDemo || false,
          verificationDate: today,
          confidence: 'high',
        };

        if (existingToday) {
          snapshotConflicts.push({
            id: `conflict-${st.username}-${today}`,
            username: st.username,
            date: today,
            existingSnapshot: existingToday,
            incomingSnapshot: autoSnap,
            existingSource: existingToday.source,
            newSource: options.sourceName,
          });
        } else {
          validSnapshots.push(autoSnap);
        }
      }
    }

    return {
      jobId,
      totalRecords: incomingStreamers.length + incomingSnapshots.length,
      newCount: batchChangeRes.newCount,
      updatedCount: batchChangeRes.updatedCount,
      unchangedCount: batchChangeRes.unchangedCount,
      duplicateCount: snapshotConflicts.length,
      errorCount: errors.length,
      errors,
      warnings,
      diffs: batchChangeRes.diffs,
      logEntries: batchChangeRes.logEntries,
      snapshotConflicts,
      preparedStreamers: validStreamers,
      preparedSnapshots: validSnapshots,
      isDemoData: options.isDemo || false,
      sourceType: options.sourceType,
      sourceName: options.sourceName,
    };
  }

  /**
   * Fase COMMIT Transaccional: Aplica los cambios validados y guarda el estado previo para Rollback
   */
  public async apply(
    previewResult: IngestionPreviewResult,
    existingStreamers: Streamer[],
    existingSnapshots: ChannelSnapshot[],
    conflictResolutions: Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>
  ): Promise<{
    job: ImportJob;
    finalStreamers: Streamer[];
    finalSnapshots: ChannelSnapshot[];
    logsCreated: ChangeLogEntry[];
  }> {
    const startedAt = new Date().toISOString();

    // 1. Guardar copia exacta de respaldo previo para ROLLBACK (Requerimiento 44, 45)
    const rollbackSnapshot = {
      previousStreamers: JSON.parse(JSON.stringify(existingStreamers)) as Streamer[],
      previousSnapshots: JSON.parse(JSON.stringify(existingSnapshots)) as ChannelSnapshot[],
      appliedStreamerIds: previewResult.preparedStreamers.map((s) => s.id),
      newStreamerIds: previewResult.diffs.filter((d) => d.isNew).map((d) => `streamer-${Normalizer.normalizeUsername(d.username)}`),
    };

    // 2. Resolver colisiones de snapshots según la decisión explícita del usuario
    const resolvedSnapshots = [...previewResult.preparedSnapshots];
    const workingSnapshots = [...existingSnapshots];

    for (const conflict of previewResult.snapshotConflicts) {
      const resolution = conflictResolutions.get(conflict.id) || 'KEEP'; // Por defecto no sobreescribir sin confirmación
      if (resolution === 'REPLACE') {
        const idx = workingSnapshots.findIndex((s) => s.id === conflict.existingSnapshot.id);
        if (idx !== -1) {
          workingSnapshots[idx] = conflict.incomingSnapshot;
        } else {
          resolvedSnapshots.push(conflict.incomingSnapshot);
        }
      } else if (resolution === 'MERGE') {
        // Fusión: Combina campos válidos priorizando explícitamente el nuevo si es no nulo
        const inc = conflict.incomingSnapshot;
        const ext = conflict.existingSnapshot;
        const merged: ChannelSnapshot = {
          ...ext,
          followers: (inc.followers ?? 0) > 0 ? inc.followers : ext.followers,
          avgViewers: (inc.avgViewers ?? 0) > 0 ? inc.avgViewers : ext.avgViewers,
          peakViewers: (inc.peakViewers ?? 0) > 0 ? inc.peakViewers : ext.peakViewers,
          hoursStreamed: (inc.hoursStreamed ?? 0) > 0 ? inc.hoursStreamed : ext.hoursStreamed,
          source: `${ext.source} + ${inc.source} (Fusionado)`,
          notes: `Snapshot fusionado el ${new Date().toISOString()}`,
        };
        const idx = workingSnapshots.findIndex((s) => s.id === conflict.existingSnapshot.id);
        if (idx !== -1) {
          workingSnapshots[idx] = merged;
        }
      }
      // Si es 'KEEP', no hacemos nada (se conserva el existente intacto)
    }

    // 3. Fusionar streamers
    const streamerMap = new Map<string, Streamer>();
    existingStreamers.forEach((s) => streamerMap.set(s.username.toLowerCase(), s));

    for (const incoming of previewResult.preparedStreamers) {
      const userKey = incoming.username.toLowerCase();
      const existing = streamerMap.get(userKey);
      if (!existing) {
        streamerMap.set(userKey, incoming);
      } else {
        // Actualizar streamer existente
        const updated: Streamer = {
          ...existing,
          displayName: incoming.displayName || existing.displayName,
          primaryCategory: incoming.primaryCategory || existing.primaryCategory,
          status: incoming.status || existing.status,
          followers: incoming.followers || existing.followers,
          avgViewers: incoming.avgViewers || existing.avgViewers,
          peakViewers: incoming.peakViewers || existing.peakViewers,
          hoursStreamed: incoming.hoursStreamed || existing.hoursStreamed,
          verificationDate: incoming.verificationDate || new Date().toISOString().split('T')[0],
          source: incoming.source || existing.source,
          updatedAt: new Date().toISOString(),
        };
        streamerMap.set(userKey, updated);
      }
    }

    const finalStreamers = Array.from(streamerMap.values());
    const finalSnapshots = [...workingSnapshots, ...resolvedSnapshots];

    const finishedAt = new Date().toISOString();

    // 4. Crear registro ImportJob
    const job: ImportJob = {
      id: previewResult.jobId,
      startedAt,
      finishedAt,
      source: previewResult.sourceName,
      sourceType: previewResult.sourceType,
      records: previewResult.totalRecords,
      created: previewResult.newCount,
      updated: previewResult.updatedCount,
      unchanged: previewResult.unchangedCount,
      duplicates: previewResult.snapshotConflicts.length,
      errors: previewResult.errors,
      warnings: previewResult.warnings,
      status: previewResult.errors.length > 0 && previewResult.preparedStreamers.length === 0 ? 'FAILED' : 'COMPLETED',
      changeCount: previewResult.logEntries.length,
      rollbackData: rollbackSnapshot,
    };

    // 5. Persistir registros de auditoría y logs de cambios
    await this.persistImportJob(job);
    if (previewResult.logEntries.length > 0) {
      await this.persistChangeLogs(previewResult.logEntries);
    }

    await this.recordAuditAction({
      id: `audit-${Date.now()}`,
      timestamp: finishedAt,
      category: 'IMPORT',
      title: `Importación masiva completada: ${previewResult.sourceName}`,
      details: `${previewResult.newCount} nuevos, ${previewResult.updatedCount} actualizados, ${previewResult.unchangedCount} sin cambios.`,
      operator: 'Administrador Local',
      metadata: { jobId: job.id, records: job.records },
    });

    return {
      job,
      finalStreamers,
      finalSnapshots,
      logsCreated: previewResult.logEntries,
    };
  }

  /**
   * ROLLBACK: Reinvierte las modificaciones introducidas por una importación sin eliminar históricos previos
   */
  public async rollback(
    job: ImportJob,
    currentStreamers: Streamer[],
    currentSnapshots: ChannelSnapshot[]
  ): Promise<{
    success: boolean;
    restoredStreamers: Streamer[];
    restoredSnapshots: ChannelSnapshot[];
    message: string;
  }> {
    if (!job.rollbackData) {
      return {
        success: false,
        restoredStreamers: currentStreamers,
        restoredSnapshots: currentSnapshots,
        message: 'Este trabajo de importación no contiene punto de restauración para rollback.',
      };
    }

    try {
      const { previousStreamers, previousSnapshots } = job.rollbackData;

      // Actualizar estado del Job a CANCELLED
      job.status = 'CANCELLED';
      await this.updateImportJobStatus(job.id, 'CANCELLED');

      // Registrar auditoría del rollback
      await this.recordAuditAction({
        id: `audit-rollback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'ROLLBACK',
        title: `Rollback ejecutado para importación ${job.id}`,
        details: `Se revirtieron las modificaciones del lote de origen: ${job.source}.`,
        operator: 'Administrador Local',
        metadata: { jobId: job.id },
      });

      return {
        success: true,
        restoredStreamers: previousStreamers,
        restoredSnapshots: previousSnapshots,
        message: `Rollback completado con éxito. Se restauraron los datos previos a la importación ${job.id}.`,
      };
    } catch (e: any) {
      return {
        success: false,
        restoredStreamers: currentStreamers,
        restoredSnapshots: currentSnapshots,
        message: `Error al ejecutar rollback: ${e?.message || 'Fallo desconocido'}`,
      };
    }
  }

  // --- MÉTODOS DE PERSISTENCIA ---

  public async getImportJobs(): Promise<ImportJob[]> {
    const raw = await appStorage.getAdapter().getItem(IMPORT_JOBS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async persistImportJob(job: ImportJob): Promise<void> {
    const jobs = await this.getImportJobs();
    jobs.unshift(job);
    // Limitar historial a últimos 100 jobs para no saturar memoria
    const trimmed = jobs.slice(0, 100);
    await appStorage.getAdapter().setItem(IMPORT_JOBS_KEY, JSON.stringify(trimmed));
  }

  private async updateImportJobStatus(jobId: string, status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED'): Promise<void> {
    const jobs = await this.getImportJobs();
    const found = jobs.find((j) => j.id === jobId);
    if (found) {
      found.status = status;
      await appStorage.getAdapter().setItem(IMPORT_JOBS_KEY, JSON.stringify(jobs));
    }
  }

  public async getChangeLogs(streamerUsername?: string): Promise<ChangeLogEntry[]> {
    const raw = await appStorage.getAdapter().getItem(CHANGE_LOGS_KEY);
    if (!raw) return [];
    try {
      const logs: ChangeLogEntry[] = JSON.parse(raw);
      if (streamerUsername) {
        const clean = streamerUsername.toLowerCase().trim().replace(/^@/, '');
        return logs.filter((l) => l.streamerUsername.toLowerCase() === clean);
      }
      return logs;
    } catch {
      return [];
    }
  }

  public async persistChangeLogs(newLogs: ChangeLogEntry[]): Promise<void> {
    const existing = await this.getChangeLogs();
    const combined = [...newLogs, ...existing].slice(0, 500); // Conservar hasta 500 entradas recientes
    await appStorage.getAdapter().setItem(CHANGE_LOGS_KEY, JSON.stringify(combined));
  }

  public async getAuditActions(): Promise<AuditActionLog[]> {
    const raw = await appStorage.getAdapter().getItem(AUDIT_ACTIONS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async recordAuditAction(action: AuditActionLog): Promise<void> {
    const actions = await this.getAuditActions();
    actions.unshift(action);
    const trimmed = actions.slice(0, 200);
    await appStorage.getAdapter().setItem(AUDIT_ACTIONS_KEY, JSON.stringify(trimmed));
  }
}

export const syncManager = SyncManager.getInstance();
