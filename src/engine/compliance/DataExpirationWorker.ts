/**
 * KICK ANALYTICS MX — DATA EXPIRATION WORKER (Fase 6, Reqs 4, 48, 50)
 * Proceso para detectar y purgar datos de KICK API cuyo TTL haya expirado (> 24h).
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { DataFreshnessManager } from './DataFreshnessManager';
import { KickApiClient } from '../../adapters/kick/KickApiClient';
import { appStorage } from '../../adapters/storage/StorageAdapter';

export interface ExpirationRunResult {
  executedAt: string;
  expiredSnapshotsRemoved: number;
  expiredStreamersFlagged: number;
  cacheCleared: boolean;
  durationMs: number;
}

export class DataExpirationWorker {
  private static instance: DataExpirationWorker;
  private freshnessManager: DataFreshnessManager;

  private constructor() {
    this.freshnessManager = DataFreshnessManager.getInstance();
  }

  public static getInstance(): DataExpirationWorker {
    if (!DataExpirationWorker.instance) {
      DataExpirationWorker.instance = new DataExpirationWorker();
    }
    return DataExpirationWorker.instance;
  }

  /**
   * Ejecuta la purga controlada de datos expirados
   */
  public async purgeExpiredData(
    streamers: Streamer[],
    snapshots: ChannelSnapshot[]
  ): Promise<{
    result: ExpirationRunResult;
    cleanedStreamers: Streamer[];
    cleanedSnapshots: ChannelSnapshot[];
  }> {
    const start = performance.now();
    const now = new Date().toISOString();

    // 1. Filtrar snapshots: Eliminar snapshots de API cuya fecha supere el TTL de 24h
    // Los snapshots MANUALES y DEMO se conservan bajo sus reglas respectivas
    let expiredSnapshotsRemoved = 0;
    const cleanedSnapshots = snapshots.filter((snap) => {
      const isApi = snap.source?.includes('KICK Public API') || snap.source?.includes('api.kick.com');
      if (!isApi) return true; // Mantener manuales / demo

      const freshness = this.freshnessManager.evaluateFreshness(snap.date, true);
      if (freshness === 'EXPIRED') {
        expiredSnapshotsRemoved++;
        return false;
      }
      return true;
    });

    // 2. Streamers: marcar los expirados para que la UI exija actualización y no los muestre como vigentes
    let expiredStreamersFlagged = 0;
    const cleanedStreamers = streamers.map((s) => {
      const isApi = s.source?.includes('KICK Public API') || !s.isDemo;
      if (!isApi) return s;

      const freshness = this.freshnessManager.evaluateFreshness(s.capturedAt, true);
      if (freshness === 'EXPIRED') {
        expiredStreamersFlagged++;
      }
      return s;
    });

    // 3. Limpiar memoria de caché de la API
    KickApiClient.getInstance().clearCache();

    // 4. Registrar en storage de auditoría técnica (sin secretos ni tokens)
    const durationMs = Math.round(performance.now() - start);
    const runResult: ExpirationRunResult = {
      executedAt: now,
      expiredSnapshotsRemoved,
      expiredStreamersFlagged,
      cacheCleared: true,
      durationMs,
    };

    try {
      const auditLogKey = 'kick_analytics_mx_last_expiration_run';
      await appStorage.setItem(auditLogKey, JSON.stringify(runResult));
    } catch {}

    return {
      result: runResult,
      cleanedStreamers,
      cleanedSnapshots,
    };
  }
}

export const dataExpirationWorker = DataExpirationWorker.getInstance();
