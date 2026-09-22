/**
 * KICK ANALYTICS MX — Trend Analyzer
 * Determina la dirección observada (CRECIMIENTO, ESTABLE, DESCENSO) mediante regresión lineal
 * y medias móviles. Cero proyecciones a futuro o especulación.
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { AnalyticalPeriod, TrendAnalysisResult, MetricProvenance } from './types';
import { MetricCalculator } from './MetricCalculator';
import { SnapshotManager } from '../SnapshotManager';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class TrendAnalyzer {
  private static freshnessManager = new DataFreshnessManager();

  public static analyzeTrend(
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: AnalyticalPeriod = '30d'
  ): TrendAnalysisResult {
    const sorted = SnapshotManager.sortSnapshots(snapshots);
    const filtered = SnapshotManager.filterByPeriod(sorted, period);
    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);

    // Mínimo 3 observaciones para determinar tendencia matemática objetiva
    if (filtered.length < 3) {
      return {
        metricId: 'trend_slope',
        period,
        direction: 'DATOS_INSUFICIENTES',
        slope: null,
        formattedSlope: 'NO DISPONIBLE',
        movingAverageLatest: null,
        observationsCount: filtered.length,
        status: 'INSUFFICIENT_DATA',
        statusReason: `Muestra insuficiente para calcular pendiente de tendencia (observaciones: ${filtered.length}, requerido: mínimo 3)`,
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: { observationsCount: filtered.length },
          period,
          formula: 'cov(x, y) / var(x)',
          formulaVersion: 'trend_slope_v1',
          sampleSize: filtered.length,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate),
          limitations: [
            'Se requiere un mínimo de 3 observaciones cronológicas para regresión lineal de tendencia.',
            'No se extrapola ni se proyecta hacia el futuro.',
          ],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
      };
    }

    // Convertir fechas a días relativos respecto a la primera observación
    const baseTime = new Date(filtered[0].date).getTime();
    const points: { x: number; y: number }[] = [];
    const values: number[] = [];

    for (const snap of filtered) {
      if (snap.followers !== null && snap.followers !== undefined) {
        const dayOffset = (new Date(snap.date).getTime() - baseTime) / (1000 * 60 * 60 * 24);
        points.push({ x: dayOffset, y: snap.followers });
        values.push(snap.followers);
      }
    }

    const slope = MetricCalculator.calculateSlope(points);
    const movingAvg = MetricCalculator.calculateAverage(values.slice(-3));

    let direction: 'CRECIMIENTO' | 'ESTABLE' | 'DESCENSO' = 'ESTABLE';
    let formattedSlope = '0.0 / día';

    if (slope !== null) {
      if (slope > 1.0) {
        direction = 'CRECIMIENTO';
        formattedSlope = `+${slope.toFixed(1)} seg/día`;
      } else if (slope < -1.0) {
        direction = 'DESCENSO';
        formattedSlope = `${slope.toFixed(1)} seg/día`;
      } else {
        direction = 'ESTABLE';
        formattedSlope = 'Estable (~0 / día)';
      }
    }

    const provenance: MetricProvenance = {
      source: streamer.source,
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: {
        pointsAnalyzed: points.length,
        firstDate: filtered[0].date,
        lastDate: filtered[filtered.length - 1].date,
      },
      period,
      formula: 'cov(x, y) / var(x)',
      formulaVersion: 'trend_slope_v1',
      sampleSize: points.length,
      capturedAt: streamer.verificationDate || filtered[filtered.length - 1].date,
      freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate),
      limitations: [
        'La tendencia describe únicamente la trayectoria matemática en el intervalo analizado.',
        'No constituye garantía ni proyección de desempeño futuro.',
      ],
      calculatedAt: new Date().toISOString(),
      isDemo,
    };

    return {
      metricId: 'trend_slope',
      period,
      direction,
      slope,
      formattedSlope,
      movingAverageLatest: movingAvg,
      observationsCount: points.length,
      status: slope !== null ? 'AVAILABLE' : 'CALCULATION_ERROR',
      provenance,
    };
  }
}
