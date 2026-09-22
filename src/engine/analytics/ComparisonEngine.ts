/**
 * KICK ANALYTICS MX — Comparison Engine
 * Motor de comparación multi-canal con desglose de muestra, tipo y proveniencia.
 */

import { Streamer, ChannelSnapshot } from '../../types';
import { MultiStreamerComparisonItem, MetricResult, AnalyticalPeriod } from './types';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { GrowthAnalyzer } from './GrowthAnalyzer';
import { ActivityAnalyzer } from './ActivityAnalyzer';
import { ConsistencyAnalyzer } from './ConsistencyAnalyzer';
import { MetricCalculator } from './MetricCalculator';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class ComparisonEngine {
  private static freshnessManager = new DataFreshnessManager();

  public static compareStreamers(
    streamers: Streamer[],
    snapshotsByStreamer: Map<string, ChannelSnapshot[]>,
    period: AnalyticalPeriod = '30d'
  ): MultiStreamerComparisonItem[] {
    const results: MultiStreamerComparisonItem[] = [];

    for (const streamer of streamers) {
      const snaps = snapshotsByStreamer.get(streamer.id) || [];
      const quality = DataQualityAnalyzer.evaluateQuality(streamer, snaps);
      const isDemo = streamer.isDemo || snaps.some((s) => s.isDemo);
      const freshness = this.freshnessManager.evaluateFreshness(streamer.verificationDate);

      const metrics: Record<string, MetricResult> = {};

      // 1. Seguidores (OBSERVADO)
      metrics['current_followers'] = {
        metricId: 'current_followers',
        name: 'Seguidores Actuales',
        shortLabel: 'Seguidores',
        value: streamer.followers.value,
        formattedValue:
          streamer.followers.value !== null
            ? streamer.followers.value.toLocaleString('es-MX')
            : 'NO DISPONIBLE',
        type: 'OBSERVADO',
        status: streamer.followers.value !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
        period: 'actual',
        sampleSize: 1,
        formulaVersion: 'observed_counter_v1',
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: { followers: streamer.followers.value },
          period: 'actual',
          formula: 'Lectura directa de perfil público',
          formulaVersion: 'observed_counter_v1',
          sampleSize: 1,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: freshness,
          limitations: ['Métrica cuantitativa acumulada.'],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
        quality,
        limitations: ['Dato público observado.'],
        calculatedAt: new Date().toISOString(),
      };

      // 2. Crecimiento en Periodo (CALCULADO)
      const growth = GrowthAnalyzer.analyzeFollowerGrowth(streamer, snaps, period);
      metrics['follower_growth_percentage'] = {
        metricId: 'follower_growth_percentage',
        name: `Crecimiento (${period})`,
        shortLabel: `Crecimiento ${period}`,
        value: growth.percentageChange,
        formattedValue: growth.formattedPercentage,
        type: 'CALCULADO',
        status: growth.status,
        statusReason: growth.statusReason,
        period,
        sampleSize: growth.sampleSize,
        formulaVersion: growth.formulaVersion,
        provenance: growth.provenance,
        quality,
        limitations: growth.limitations,
        calculatedAt: new Date().toISOString(),
      };

      // 3. Concurrencia Promedio (CALCULADO)
      metrics['average_viewers'] = {
        metricId: 'average_viewers',
        name: 'Audiencia Media Concurrente',
        shortLabel: 'Media Viewers',
        value: streamer.avgViewers.value,
        formattedValue:
          streamer.avgViewers.value !== null
            ? streamer.avgViewers.value.toLocaleString('es-MX')
            : 'NO DISPONIBLE',
        type: 'CALCULADO',
        status: streamer.avgViewers.value !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
        period: 'muestra',
        sampleSize: snaps.length || 1,
        formulaVersion: 'average_viewers_v1',
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: { avgViewers: streamer.avgViewers.value },
          period: 'muestra',
          formula: 'Media aritmética de directos documentados',
          formulaVersion: 'average_viewers_v1',
          sampleSize: snaps.length || 1,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: freshness,
          limitations: ['Promedio representativo de las muestras observadas.'],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
        quality,
        limitations: ['Sensible a directos con picos inusuales.'],
        calculatedAt: new Date().toISOString(),
      };

      // 4. Pico de Audiencia (OBSERVADO)
      metrics['peak_viewers'] = {
        metricId: 'peak_viewers',
        name: 'Pico de Espectadores',
        shortLabel: 'Pico Viewers',
        value: streamer.peakViewers.value,
        formattedValue:
          streamer.peakViewers.value !== null
            ? streamer.peakViewers.value.toLocaleString('es-MX')
            : 'NO DISPONIBLE',
        type: 'OBSERVADO',
        status: streamer.peakViewers.value !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
        period: 'muestra',
        sampleSize: 1,
        formulaVersion: 'observed_peak_v1',
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: { peakViewers: streamer.peakViewers.value },
          period: 'muestra',
          formula: 'Máximo valor detectado',
          formulaVersion: 'observed_peak_v1',
          sampleSize: 1,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: freshness,
          limitations: ['Registra la mayor concurrencia instantánea.'],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
        quality,
        limitations: ['Evento pico aislado.'],
        calculatedAt: new Date().toISOString(),
      };

      // 5. Ratio Viewers / Followers (CALCULADO)
      const ratioRes = MetricCalculator.calculateRatio(
        streamer.avgViewers.value,
        streamer.followers.value
      );
      metrics['viewer_follower_ratio'] = {
        metricId: 'viewer_follower_ratio',
        name: 'Ratio Viewers / Followers',
        shortLabel: 'Ratio V/F',
        value: ratioRes.ratio,
        formattedValue: ratioRes.displayText,
        type: 'CALCULADO',
        status: ratioRes.status,
        statusReason: ratioRes.reason,
        period: 'actual',
        sampleSize: 1,
        formulaVersion: 'viewer_follower_ratio_v1',
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: {
            viewers: streamer.avgViewers.value,
            followers: streamer.followers.value,
          },
          period: 'actual',
          formula: 'viewers / followers',
          formulaVersion: 'viewer_follower_ratio_v1',
          sampleSize: 1,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: freshness,
          limitations: ['No equivale a engagement cualitativo.'],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
        quality,
        limitations: ['Ratio meramente aritmético.'],
        calculatedAt: new Date().toISOString(),
      };

      // 6. Actividad y Regularidad
      const activity = ActivityAnalyzer.analyzeActivity(streamer, snaps, period);
      metrics['stream_count'] = activity.streamCount;
      metrics['stream_frequency'] = activity.streamFrequency;
      metrics['stream_duration'] = activity.durationAverage;

      const consistency = ConsistencyAnalyzer.analyzeConsistency(streamer, snaps);
      metrics['activity_consistency'] = {
        metricId: 'activity_consistency',
        name: 'Regularidad Observada',
        shortLabel: 'Regularidad',
        value: consistency.regularityScore,
        formattedValue:
          consistency.regularityScore !== null
            ? `${consistency.regularityScore}% (${consistency.stabilityLabel})`
            : 'NO DISPONIBLE',
        type: 'CALCULADO',
        status: consistency.status,
        statusReason: consistency.neutralDescription,
        period: 'historico',
        sampleSize: consistency.observationsCount,
        formulaVersion: 'activity_consistency_v1',
        provenance: consistency.provenance,
        quality,
        limitations: [
          'Medición de estabilidad temporal del calendario. No califica al streamer.',
        ],
        calculatedAt: new Date().toISOString(),
      };

      results.push({
        streamer,
        metrics,
        sampleSize: snaps.length,
        dataQualityScore: quality.score,
        source: streamer.source,
        coverageLabel: `Muestra disponible (${snaps.length} capturas)`,
      });
    }

    return results;
  }
}
