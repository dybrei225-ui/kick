/**
 * KICK ANALYTICS MX — KICK SYNC LOGGER (Fase 5, Reqs 15, 41)
 * Historial transaccional y auditoría de ejecuciones de sincronización con la API oficial.
 */

import { AuditActionLog } from '../../types';
import { appStorage } from '../storage/StorageAdapter';

export type SyncType = 'MANUAL' | 'SCHEDULED' | 'INDIVIDUAL' | 'MASSIVE';

export interface SyncExecutionLog {
  id: string; // e.g. SYNC-000124
  date: string;
  timestamp: string;
  type: SyncType;
  streamerTarget?: string;
  source: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  requestsCount: number;
  successesCount: number;
  errorsCount: number;
  newRecordsCount: number;
  updatedRecordsCount: number;
  skippedRecordsCount: number;
  errorMessages: string[];
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'RATE_LIMITED';
}

const SYNC_LOGS_STORAGE_KEY = 'kick_analytics_mx_sync_execution_logs_v1';
const AUDIT_ACTIONS_KEY = 'kick_analytics_mx_audit_actions_v1';

export class KickSyncLogger {
  private static instance: KickSyncLogger;
  private logsCache: SyncExecutionLog[] = [];
  private isLoaded = false;

  public static getInstance(): KickSyncLogger {
    if (!KickSyncLogger.instance) {
      KickSyncLogger.instance = new KickSyncLogger();
    }
    return KickSyncLogger.instance;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await appStorage.getItem(SYNC_LOGS_STORAGE_KEY);
      if (raw) {
        this.logsCache = JSON.parse(raw);
      }
    } catch {
      this.logsCache = [];
    }
    this.isLoaded = true;
  }

  public async getLogs(): Promise<SyncExecutionLog[]> {
    await this.ensureLoaded();
    return [...this.logsCache].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  public async recordExecution(entry: Omit<SyncExecutionLog, 'id'>): Promise<SyncExecutionLog> {
    await this.ensureLoaded();
    const count = this.logsCache.length + 1;
    const padded = String(count).padStart(6, '0');
    const id = `SYNC-${padded}`;

    const newLog: SyncExecutionLog = {
      ...entry,
      id,
    };

    this.logsCache.unshift(newLog);
    if (this.logsCache.length > 200) {
      this.logsCache = this.logsCache.slice(0, 200);
    }

    try {
      await appStorage.setItem(SYNC_LOGS_STORAGE_KEY, JSON.stringify(this.logsCache));
    } catch (err) {
      console.warn('[KickSyncLogger] No se pudo persistir registro de sync', err);
    }

    // Registrar en auditoría existente (Req 41)
    await this.recordAuditAction({
      category: 'IMPORT',
      title: `Sincronización KICK API (${id})`,
      details: `${newLog.type} - Streamers: ${newLog.newRecordsCount + newLog.updatedRecordsCount + newLog.skippedRecordsCount}, Éxitos: ${newLog.successesCount}, Errores: ${newLog.errorsCount}.`,
      operator: 'RealKickDataProvider / SyncManager',
      metadata: {
        syncId: id,
        durationMs: newLog.durationMs,
        status: newLog.status,
      },
    });

    return newLog;
  }

  /**
   * Integra con la auditoría existente de la plataforma (AuditActionLog)
   */
  public async recordAuditAction(action: Omit<AuditActionLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const existingRaw = await appStorage.getItem(AUDIT_ACTIONS_KEY);
      const existing: AuditActionLog[] = existingRaw ? JSON.parse(existingRaw) : [];

      const newAudit: AuditActionLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        ...action,
      };

      existing.unshift(newAudit);
      if (existing.length > 300) {
        existing.splice(300);
      }
      await appStorage.setItem(AUDIT_ACTIONS_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn('[KickSyncLogger] No se pudo guardar acción de auditoría', err);
    }
  }

  public async clearLogs(): Promise<void> {
    this.logsCache = [];
    await appStorage.removeItem(SYNC_LOGS_STORAGE_KEY);
  }
}
