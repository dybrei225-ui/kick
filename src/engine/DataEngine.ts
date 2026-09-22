/**
 * KICK ANALYTICS MX — CENTRAL DATA ENGINE
 * Arquitectura centralizada que orquesta la ingesta, normalización,
 * validación, deduplicación, estadísticas, anomalías y reportes.
 */

import {
  Streamer,
  ChannelSnapshot,
  CategoryData,
  RegisteredSource,
  SystemAlert,
  GlobalDataStatus,
  QualityAuditReport,
  ImportValidationResult,
  DuplicateCandidate,
} from '../types';
import { Normalizer } from './Normalizer';
import { Validator } from './Validator';
import { Deduplicator } from './Deduplicator';
import { SnapshotManager } from './SnapshotManager';
import { StatisticsEngine } from './StatisticsEngine';
import { AnomalyDetector } from './AnomalyDetector';
import { SourceRegistry } from './SourceRegistry';
import { ReportEngine } from './ReportEngine';

export class DataEngine {
  private sourceRegistry: SourceRegistry;

  constructor() {
    this.sourceRegistry = new SourceRegistry();
  }

  public get normalizer() {
    return Normalizer;
  }

  public get validator() {
    return Validator;
  }

  public get deduplicator() {
    return Deduplicator;
  }

  public get snapshotManager() {
    return SnapshotManager;
  }

  public get statistics() {
    return StatisticsEngine;
  }

  public get anomalyDetector() {
    return AnomalyDetector;
  }

  public get sourceReg() {
    return this.sourceRegistry;
  }

  public get reportEngine() {
    return ReportEngine;
  }

  /**
   * Requirement 39: Estado global del sistema (DATA STATUS)
   * Clasifica: REAL, MANUAL, DEMO, MIXED, NO DATA.
   * Si existen varios tipos: MIXED y desglosa qué tipos existen.
   */
  public evaluateGlobalDataStatus(
    streamers: Streamer[],
    isDemoActive: boolean
  ): {
    status: GlobalDataStatus;
    label: string;
    details: string;
    badgeColor: string;
    composition: { real: number; manual: number; demo: number };
  } {
    if (!streamers || streamers.length === 0) {
      return {
        status: 'NO_DATA',
        label: 'SIN DATOS',
        details: 'No existen registros cargados en el sistema.',
        badgeColor: 'text-zinc-400 bg-zinc-900 border-zinc-700',
        composition: { real: 0, manual: 0, demo: 0 },
      };
    }

    let demoCount = 0;
    let manualCount = 0;
    let realCount = 0;

    for (const s of streamers) {
      if (s.isDemo) {
        demoCount++;
      } else if (s.source?.toLowerCase().includes('oficial') || s.source?.toLowerCase().includes('público')) {
        realCount++;
      } else {
        manualCount++;
      }
    }

    const typesPresent: string[] = [];
    if (realCount > 0) typesPresent.push(`Observado Real (${realCount})`);
    if (manualCount > 0) typesPresent.push(`Manual (${manualCount})`);
    if (demoCount > 0) typesPresent.push(`Demostrativo (${demoCount})`);

    if (typesPresent.length > 1) {
      return {
        status: 'MIXED',
        label: 'DATOS MIXTOS',
        details: `Composición activa: ${typesPresent.join(', ')}.`,
        badgeColor: 'text-amber-300 bg-amber-950/60 border-amber-800/40',
        composition: { real: realCount, manual: manualCount, demo: demoCount },
      };
    }

    if (demoCount > 0) {
      return {
        status: 'DEMO',
        label: 'MODO DEMO',
        details: 'Todos los registros visibles corresponden a datos demostrativos estructurados.',
        badgeColor: 'text-purple-300 bg-purple-950/60 border-purple-800/40',
        composition: { real: 0, manual: 0, demo: demoCount },
      };
    }

    if (manualCount > 0) {
      return {
        status: 'MANUAL',
        label: 'DATOS MANUALES',
        details: 'Registros capturados e introducidos de forma manual por el usuario.',
        badgeColor: 'text-sky-300 bg-sky-950/60 border-sky-800/40',
        composition: { real: 0, manual: manualCount, demo: 0 },
      };
    }

    return {
      status: 'REAL',
      label: 'DATOS OBSERVADOS REALES',
      details: 'Registros obtenidos mediante observación pública verificada en Kick.',
      badgeColor: 'text-[#53FC18] bg-emerald-950/60 border-emerald-800/40',
      composition: { real: realCount, manual: 0, demo: 0 },
    };
  }

  /**
   * Requirement 17: Dashboard de Calidad / Auditoría del Sistema
   */
  public runFullQualityAudit(
    streamers: Streamer[],
    allSnapshots: ChannelSnapshot[]
  ): QualityAuditReport {
    const issues: QualityAuditReport['issues'] = [];
    let validChannelsCount = 0;
    let withSourceCount = 0;
    let needsUpdateCount = 0;
    let noHistoryCount = 0;
    let incompleteCount = 0;
    let duplicatesCount = 0;
    let demoCount = 0;

    const seenUsernames = new Set<string>();

    for (const s of streamers) {
      const normUser = Normalizer.normalizeUsername(s.username);

      if (seenUsernames.has(normUser)) {
        duplicatesCount++;
        issues.push({
          type: 'error',
          category: 'duplicate',
          message: `Username duplicado detectado: @${s.username}`,
          target: `@${s.username}`,
        });
      } else {
        seenUsernames.add(normUser);
      }

      if (s.isDemo) {
        demoCount++;
      }

      // Presencia de fuente
      if (s.source && s.source.trim().length > 0) {
        withSourceCount++;
      } else {
        issues.push({
          type: 'warning',
          category: 'missing',
          message: `Canal @${s.username} no especifica fuente de origen.`,
          target: `@${s.username}`,
        });
      }

      // Antigüedad de verificación
      const recency = SnapshotManager.evaluateDataRecency(s.verificationDate);
      if (recency.category === 'DESACTUALIZADO' || recency.category === 'ANTIGUO' || recency.category === 'MUY_ANTIGUO') {
        needsUpdateCount++;
        issues.push({
          type: 'warning',
          category: 'stale',
          message: `Registro de @${s.username} clasificado como ${recency.category} (${recency.label}).`,
          target: `@${s.username}`,
        });
      }

      // Snapshots del canal
      const snaps = allSnapshots.filter((snap) => snap.streamerId === s.id);
      if (snaps.length === 0) {
        noHistoryCount++;
        issues.push({
          type: 'warning',
          category: 'missing',
          message: `Canal @${s.username} no tiene capturas en el histórico.`,
          target: `@${s.username}`,
        });
      }

      // Chequeo de integridad de métricas numéricas
      let isIncomplete = false;
      if (s.followers.value === null) isIncomplete = true;
      if (s.avgViewers.value === null) isIncomplete = true;
      if (s.hoursStreamed.value === null) isIncomplete = true;

      if (isIncomplete) {
        incompleteCount++;
      } else {
        validChannelsCount++;
      }
    }

    const total = streamers.length;
    const completePercent = total > 0 ? Math.round((validChannelsCount / total) * 100) : 0;
    const incompletePercent = total > 0 ? Math.round((incompleteCount / total) * 100) : 0;

    return {
      totalChannels: total,
      validChannelsCount,
      withSourceCount,
      needsUpdateCount,
      noHistoryCount,
      incompleteCount,
      duplicatesCount,
      demoCount,
      totalSnapshots: allSnapshots.length,
      sourcesCount: this.sourceRegistry.getSources().length,
      completePercent,
      incompletePercent,
      issues,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * Requirement 27 & 28: Procesa importaciones de texto plano (JSON o CSV)
   * Proceso de 2 pasos: Analiza -> Valida -> Detecta duplicados -> Retorna resumen
   * NUNCA guarda inmediatamente.
   */
  public parseAndValidateImport(
    rawText: string,
    existingStreamers: Streamer[],
    existingSnapshots: ChannelSnapshot[]
  ): ImportValidationResult {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: ['El archivo de entrada está vacío.'],
        warnings: [],
      };
    }

    // Comprobar si es JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return this.parseJsonImport(trimmed, existingStreamers, existingSnapshots);
    }

    // Si no empieza con JSON, intentar analizar como CSV
    return this.parseCsvImport(trimmed, existingStreamers);
  }

  private parseJsonImport(
    jsonText: string,
    existingStreamers: Streamer[],
    existingSnapshots: ChannelSnapshot[]
  ): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicatesDetected: DuplicateCandidate[] = [];

    try {
      const parsed = JSON.parse(jsonText);
      let incomingStreamers: unknown[] = [];
      let incomingSnapshots: unknown[] = [];

      if (Array.isArray(parsed)) {
        incomingStreamers = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.streamers)) {
          incomingStreamers = parsed.streamers;
        }
        if (Array.isArray(parsed.snapshots)) {
          incomingSnapshots = parsed.snapshots;
        }
      }

      const validValidatedStreamers: Streamer[] = [];
      let newCount = 0;
      let modifiedCount = 0;

      for (const item of incomingStreamers) {
        const valRes = Validator.validateStreamer(item);
        if (!valRes.isValid) {
          errors.push(...valRes.errors);
          continue;
        }

        if (valRes.warnings.length > 0) {
          warnings.push(...valRes.warnings);
        }

        const normStreamer = valRes.normalizedData as Streamer;

        // Comprobar duplicados con la base existente
        const duplicate = Deduplicator.findStreamerDuplicate(normStreamer, existingStreamers);
        if (duplicate) {
          modifiedCount++;
          duplicatesDetected.push(duplicate);
        } else {
          newCount++;
        }

        validValidatedStreamers.push(normStreamer);
      }

      const validValidatedSnapshots: ChannelSnapshot[] = [];
      for (const item of incomingSnapshots) {
        const snapRes = Validator.validateSnapshot(item);
        if (snapRes.isValid && snapRes.normalizedSnapshot) {
          const snapDup = Deduplicator.findSnapshotDuplicate(snapRes.normalizedSnapshot, existingSnapshots);
          if (snapDup) {
            duplicatesDetected.push(snapDup);
          }
          validValidatedSnapshots.push(snapRes.normalizedSnapshot);
        } else {
          warnings.push(...snapRes.errors);
        }
      }

      return {
        valid: errors.length === 0 && (validValidatedStreamers.length > 0 || validValidatedSnapshots.length > 0),
        validCount: validValidatedStreamers.length + validValidatedSnapshots.length,
        modifiedCount,
        newCount,
        errorCount: errors.length,
        errors,
        warnings,
        duplicatesDetected,
        parsedPayload: {
          streamers: validValidatedStreamers,
          snapshots: validValidatedSnapshots,
        },
      };
    } catch (err: any) {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: [`Error de análisis JSON: ${err?.message || 'Estructura JSON inválida'}`],
        warnings: [],
      };
    }
  }

  private parseCsvImport(
    csvText: string,
    existingStreamers: Streamer[]
  ): ImportValidationResult {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: ['El archivo CSV debe contener una fila de encabezados y al menos un registro de datos.'],
        warnings: [],
      };
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const userIdx = headers.indexOf('username');
    const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('displayname');
    const followersIdx = headers.indexOf('followers');
    const avgViewersIdx = headers.indexOf('averageviewers') !== -1 ? headers.indexOf('averageviewers') : headers.indexOf('avgviewers');
    const peakViewersIdx = headers.indexOf('peakviewers');
    const hoursIdx = headers.indexOf('hoursstreamed') !== -1 ? headers.indexOf('hoursstreamed') : headers.indexOf('hours');
    const streamsIdx = headers.indexOf('streamscount') !== -1 ? headers.indexOf('streamscount') : headers.indexOf('streams');
    const catIdx = headers.indexOf('category');
    const statusIdx = headers.indexOf('status');
    const sourceIdx = headers.indexOf('source');
    const dateIdx = headers.indexOf('capturedat') !== -1 ? headers.indexOf('capturedat') : headers.indexOf('date');
    const dataTypeIdx = headers.indexOf('datatype');
    const urlIdx = headers.indexOf('sourceurl') !== -1 ? headers.indexOf('sourceurl') : headers.indexOf('url');

    if (userIdx === -1) {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: ['El encabezado del CSV debe incluir obligatoriamente la columna "username".'],
        warnings: [],
      };
    }

    const validStreamers: Streamer[] = [];
    const validSnapshots: ChannelSnapshot[] = [];
    const duplicatesDetected: DuplicateCandidate[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let newCount = 0;
    let modifiedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const rawUser = parts[userIdx];
      if (!rawUser) continue;

      const rawFollowers = followersIdx !== -1 ? Number(parts[followersIdx]) : 0;
      const rawAvg = avgViewersIdx !== -1 ? Number(parts[avgViewersIdx]) : 0;
      const rawPeak = peakViewersIdx !== -1 ? Number(parts[peakViewersIdx]) : 0;
      const rawHours = hoursIdx !== -1 ? Number(parts[hoursIdx]) : 0;
      const rawStreams = streamsIdx !== -1 ? Number(parts[streamsIdx]) : 0;
      const rawCat = catIdx !== -1 && parts[catIdx] ? parts[catIdx] : 'Gaming';
      const rawStatus = (statusIdx !== -1 && parts[statusIdx] ? parts[statusIdx] : 'active') as any;
      const rawSource = sourceIdx !== -1 && parts[sourceIdx] ? parts[sourceIdx] : 'Importación CSV';
      const rawName = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : rawUser;
      const rawDate = dateIdx !== -1 && parts[dateIdx] ? parts[dateIdx] : new Date().toISOString().split('T')[0];
      const rawDataType = dataTypeIdx !== -1 && parts[dataTypeIdx] ? parts[dataTypeIdx].toUpperCase() : 'OBSERVED';
      const rawUrl = urlIdx !== -1 && parts[urlIdx] ? parts[urlIdx] : null;

      const isDemo = rawDataType === 'DEMO';
      const metricType = isDemo ? 'demo_generated' : rawDataType === 'MANUAL' ? 'manual_audit' : 'observed_counter';

      const candidateObj: Partial<Streamer> = {
        id: `streamer-csv-${Normalizer.normalizeUsername(rawUser)}`,
        username: rawUser,
        displayName: rawName,
        primaryCategory: rawCat,
        categories: [rawCat],
        status: ['active', 'low_activity', 'inactive', 'suspended', 'deleted', 'unverifiable'].includes(rawStatus)
          ? rawStatus
          : 'active',
        followers: {
          value: isNaN(rawFollowers) ? 0 : rawFollowers,
          period: 'Tiempo real',
          source: rawSource,
          dataType: metricType as any,
        },
        avgViewers: {
          value: isNaN(rawAvg) ? 0 : rawAvg,
          period: '30 días',
          source: rawSource,
          dataType: 'calculated_average',
        },
        peakViewers: {
          value: isNaN(rawPeak) ? 0 : rawPeak,
          period: '30 días',
          source: rawSource,
          dataType: 'observed_peak',
        },
        hoursStreamed: {
          value: isNaN(rawHours) ? 0 : rawHours,
          period: '30 días',
          source: rawSource,
          dataType: 'accumulated_hours',
        },
        streamCount: {
          value: isNaN(rawStreams) ? 0 : rawStreams,
          period: '30 días',
          source: rawSource,
          dataType: 'observed_counter',
        },
        country: 'México',
        source: rawSource,
        verificationDate: rawDate,
        isDemo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const valRes = Validator.validateStreamer(candidateObj);
      if (!valRes.isValid) {
        errors.push(`Línea ${i + 1}: ${valRes.errors.join(', ')}`);
        continue;
      }

      const norm = valRes.normalizedData as Streamer;
      const duplicate = Deduplicator.findStreamerDuplicate(norm, existingStreamers);
      if (duplicate) {
        modifiedCount++;
        duplicatesDetected.push(duplicate);
      } else {
        newCount++;
      }

      validStreamers.push(norm);

      // Snapshot complementario de la fila
      validSnapshots.push({
        id: `snap-csv-${norm.username}-${rawDate}`,
        streamerId: norm.id,
        streamerUsername: norm.username,
        streamerDisplayName: norm.displayName,
        date: rawDate,
        period: 'Diario',
        followers: isNaN(rawFollowers) ? 0 : rawFollowers,
        avgViewers: isNaN(rawAvg) ? 0 : rawAvg,
        peakViewers: isNaN(rawPeak) ? 0 : rawPeak,
        hoursStreamed: isNaN(rawHours) ? 0 : rawHours,
        streamCount: isNaN(rawStreams) ? 0 : rawStreams,
        category: rawCat,
        source: rawSource,
        dataType: metricType as any,
        isDemo,
        verificationDate: rawDate,
        notes: rawUrl ? `Verificado en ${rawUrl}` : undefined,
      });
    }

    return {
      valid: errors.length === 0 && validStreamers.length > 0,
      validCount: validStreamers.length,
      modifiedCount,
      newCount,
      errorCount: errors.length,
      errors,
      warnings,
      duplicatesDetected,
      parsedPayload: {
        streamers: validStreamers,
        snapshots: validSnapshots,
      },
    };
  }

  /**
   * Requirement 28: Exportar backup completo del sistema
   */
  public generateFullBackupJson(
    streamers: Streamer[],
    snapshots: ChannelSnapshot[],
    categories: CategoryData[]
  ): string {
    const backupObj = {
      app: 'KICK ANALYTICS MX',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalChannels: streamers.length,
        totalSnapshots: snapshots.length,
        totalCategories: categories.length,
      },
      sources: this.sourceRegistry.getSources(),
      streamers,
      snapshots,
      categories,
    };
    return JSON.stringify(backupObj, null, 2);
  }
}

export const dataEngine = new DataEngine();
