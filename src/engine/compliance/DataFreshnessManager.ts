/**
 * KICK ANALYTICS MX — DATA FRESHNESS MANAGER (Fase 6, Reqs 26, 27)
 * Clasificación de vigencia y frescura de los datos según las políticas de retención.
 */

import { ApiDataFreshnessStatus, Streamer } from '../../types';
import { KickDataPolicy } from './KickDataPolicy';

export interface FreshnessSummary {
  freshCount: number;
  agingCount: number;
  staleCount: number;
  expiredCount: number;
  unknownCount: number;
  totalChannels: number;
}

export class DataFreshnessManager {
  private static instance: DataFreshnessManager;

  public static getInstance(): DataFreshnessManager {
    if (!DataFreshnessManager.instance) {
      DataFreshnessManager.instance = new DataFreshnessManager();
    }
    return DataFreshnessManager.instance;
  }

  /**
   * Evalúa la frescura de un registro de streamer o snapshot
   */
  public evaluateFreshness(
    capturedAtString: string | null | undefined,
    isApiData = true
  ): ApiDataFreshnessStatus {
    if (!capturedAtString) return 'UNKNOWN';

    const capturedTime = new Date(capturedAtString).getTime();
    if (isNaN(capturedTime)) return 'UNKNOWN';

    const ageSeconds = Math.max(0, Math.floor((Date.now() - capturedTime) / 1000));

    // Si no es dato de API (ej: manual o interno), la ventana es más amplia
    if (!isApiData) {
      if (ageSeconds < 7 * 86400) return 'FRESH'; // < 7 días
      if (ageSeconds < 30 * 86400) return 'AGING'; // < 30 días
      return 'STALE';
    }

    // Regla estricta KICK API (TTL 24h = 86400s)
    const maxTtl = KickDataPolicy.API_CACHE_MAX_TTL_SECONDS;
    if (ageSeconds < 6 * 3600) return 'FRESH'; // < 6 horas
    if (ageSeconds < 18 * 3600) return 'AGING'; // 6h a 18h
    if (ageSeconds < maxTtl) return 'STALE'; // 18h a 24h (próximo a expirar)
    return 'EXPIRED'; // > 24 horas
  }

  /**
   * Genera el resumen general de frescura para el catálogo de streamers
   */
  public getFreshnessSummary(streamers: Streamer[]): FreshnessSummary {
    let freshCount = 0;
    let agingCount = 0;
    let staleCount = 0;
    let expiredCount = 0;
    let unknownCount = 0;

    streamers.forEach((s) => {
      const isApi = s.source?.includes('API') || !s.isDemo;
      const date = s.capturedAt || s.followers.capturedAt || s.followers.lastUpdated;
      const status = this.evaluateFreshness(date, isApi);

      switch (status) {
        case 'FRESH':
          freshCount++;
          break;
        case 'AGING':
          agingCount++;
          break;
        case 'STALE':
          staleCount++;
          break;
        case 'EXPIRED':
          expiredCount++;
          break;
        default:
          unknownCount++;
          break;
      }
    });

    return {
      freshCount,
      agingCount,
      staleCount,
      expiredCount,
      unknownCount,
      totalChannels: streamers.length,
    };
  }
}

export const dataFreshnessManager = DataFreshnessManager.getInstance();
