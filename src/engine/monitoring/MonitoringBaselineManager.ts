/**
 * KICK ANALYTICS MX — MONITORING BASELINE MANAGER (Fase 8)
 * Gestiona y calcula valores de referencia (baselines) para comparaciones deterministas.
 * 
 * Regla: No comparar datos incompatibles (unidades distintas, periodos incompatibles, DEMO vs REAL).
 * Cada baseline incluye tipo de referencia, periodo y muestra.
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { BaselineType, MonitoringBaseline } from './types';

export class MonitoringBaselineManager {
  private static instance: MonitoringBaselineManager;

  private constructor() {}

  public static getInstance(): MonitoringBaselineManager {
    if (!MonitoringBaselineManager.instance) {
      MonitoringBaselineManager.instance = new MonitoringBaselineManager();
    }
    return MonitoringBaselineManager.instance;
  }

  /**
   * Obtiene la línea base (baseline) adecuada para un streamer y métrica dada
   */
  public getBaseline(
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    metricId: string,
    preferredType: BaselineType = 'previous_observation'
  ): MonitoringBaseline | null {
    // Validar separación estricta DEMO vs REAL
    for (const snap of snapshots) {
      if (Boolean(snap.isDemo) !== Boolean(streamer.isDemo)) {
        throw new Error(
          'ERROR DE INTEGRIDAD: No se puede calcular una línea base combinando datos DEMO y REAL.'
        );
      }
    }

    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sorted.length === 0) {
      return null;
    }

    switch (metricId) {
      case 'followers':
      case 'follower_growth_percentage': {
        const validSnaps = sorted.filter((s) => s.followers !== null && s.followers !== undefined);
        if (validSnaps.length === 0) return null;

        if (preferredType === 'previous_observation') {
          // Último snapshot antes del estado actual
          const lastSnap = validSnaps[validSnaps.length - 1];
          return {
            type: 'previous_observation',
            metricId: 'followers',
            referenceValue: lastSnap.followers,
            period: lastSnap.period || 'captura_previa',
            sampleSize: validSnaps.length,
            timestamp: lastSnap.date,
            source: lastSnap.source,
          };
        }

        if (preferredType === 'historical_baseline') {
          const firstSnap = validSnaps[0];
          return {
            type: 'historical_baseline',
            metricId: 'followers',
            referenceValue: firstSnap.followers,
            period: 'historico_inicial',
            sampleSize: validSnaps.length,
            timestamp: firstSnap.date,
            source: firstSnap.source,
          };
        }
        break;
      }

      case 'average_viewers':
      case 'viewer_growth_percentage': {
        const validSnaps = sorted.filter((s) => s.avgViewers !== null && s.avgViewers !== undefined);
        if (validSnaps.length === 0) return null;

        if (preferredType === 'previous_observation') {
          const lastSnap = validSnaps[validSnaps.length - 1];
          return {
            type: 'previous_observation',
            metricId: 'average_viewers',
            referenceValue: lastSnap.avgViewers,
            period: lastSnap.period || 'captura_previa',
            sampleSize: validSnaps.length,
            timestamp: lastSnap.date,
            source: lastSnap.source,
          };
        }

        if (preferredType === 'rolling_average') {
          const sum = validSnaps.reduce((acc, curr) => acc + (curr.avgViewers || 0), 0);
          const avg = Math.round(sum / validSnaps.length);
          return {
            type: 'rolling_average',
            metricId: 'average_viewers',
            referenceValue: avg,
            period: `${validSnaps.length}_observaciones`,
            sampleSize: validSnaps.length,
            timestamp: validSnaps[validSnaps.length - 1].date,
            source: streamer.source,
          };
        }

        if (preferredType === 'rolling_median') {
          const vals = validSnaps.map((s) => s.avgViewers || 0).sort((a, b) => a - b);
          const mid = Math.floor(vals.length / 2);
          const median = vals.length % 2 !== 0 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2);
          return {
            type: 'rolling_median',
            metricId: 'average_viewers',
            referenceValue: median,
            period: `${validSnaps.length}_observaciones`,
            sampleSize: validSnaps.length,
            timestamp: validSnaps[validSnaps.length - 1].date,
            source: streamer.source,
          };
        }
        break;
      }

      case 'peak_viewers': {
        const validSnaps = sorted.filter((s) => s.peakViewers !== null && s.peakViewers !== undefined);
        if (validSnaps.length === 0) return null;

        // Máximo histórico previo
        const maxPrev = Math.max(...validSnaps.map((s) => s.peakViewers || 0));
        return {
          type: 'historical_baseline',
          metricId: 'peak_viewers',
          referenceValue: maxPrev,
          period: 'muestra_disponible',
          sampleSize: validSnaps.length,
          timestamp: validSnaps[validSnaps.length - 1].date,
          source: streamer.source,
        };
      }

      case 'stream_count': {
        if (sorted.length < 2) return null;
        // Penúltimo snapshot como baseline de emisiones
        const prevSnap = sorted[sorted.length - 2];
        return {
          type: 'previous_period',
          metricId: 'stream_count',
          referenceValue: prevSnap.hoursStreamed ? Math.max(1, Math.round(prevSnap.hoursStreamed / 3)) : 4,
          period: prevSnap.period || 'periodo_anterior',
          sampleSize: sorted.length,
          timestamp: prevSnap.date,
          source: prevSnap.source,
        };
      }

      case 'primary_category': {
        if (sorted.length === 0) return null;
        const lastSnap = sorted[sorted.length - 1];
        return {
          type: 'previous_observation',
          metricId: 'primary_category',
          referenceValue: lastSnap.category || 'General',
          period: 'captura_previa',
          sampleSize: sorted.length,
          timestamp: lastSnap.date,
          source: lastSnap.source,
        };
      }
    }

    return null;
  }
}

export const monitoringBaselineManager = MonitoringBaselineManager.getInstance();
