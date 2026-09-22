/**
 * KICK ANALYTICS MX — Growth Analyzer
 * Analiza variaciones temporales de seguidores, audiencia y horas sin interpolaciones ni datos inventados.
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { AnalyticalPeriod, GrowthAnalysisResult, MetricProvenance } from './types';
import { MetricCalculator } from './MetricCalculator';
import { SnapshotManager } from '../SnapshotManager';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class GrowthAnalyzer {
  private static freshnessManager = new DataFreshnessManager();

  /**
   * Analiza el crecimiento de seguidores para un periodo dado.
   */
  public static analyzeFollowerGrowth(
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: AnalyticalPeriod = '30d'
  ): GrowthAnalysisResult {
    const sorted = SnapshotManager.sortSnapshots(snapshots);
    const filtered = SnapshotManager.filterByPeriod(sorted, period);

    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);

    // Integridad: verificar que no haya mezcla entre DEMO y REAL
    const hasReal = !streamer.isDemo && snapshots.some((s) => !s.isDemo);
    const hasDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);
    if (hasReal && hasDemo && !streamer.isDemo && snapshots.some((s) => s.isDemo)) {
      throw new Error('ERROR DE INTEGRIDAD: Prohibido mezclar observaciones DEMO con registros REALES.');
    }

    // Validación de muestra mínima (requiere al menos 2 observaciones cronológicas)
    if (filtered.length < 2) {
      const single = filtered.length === 1 ? filtered[0] : null;
      return {
        metricId: 'follower_growth_percentage',
        period,
        initialValue: single?.followers ?? null,
        finalValue: streamer.followers.value ?? single?.followers ?? null,
        initialDate: single?.date ?? null,
        finalDate: streamer.verificationDate || single?.date || null,
        absoluteChange: null,
        percentageChange: null,
        formattedPercentage: 'NO DISPONIBLE',
        trend: 'NO_DISPONIBLE',
        sampleSize: filtered.length,
        status: 'INSUFFICIENT_DATA',
        statusReason: `Muestra insuficiente para el período ${period} (observaciones: ${filtered.length}, requerido: mínimo 2)`,
        formulaVersion: 'growth_rate_v1',
        provenance: {
          source: streamer.source,
          sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
          inputsUsed: {
            observationsCount: filtered.length,
            streamerFollowers: streamer.followers.value,
          },
          period,
          formula: '((valor_final - valor_inicial) / valor_inicial) * 100',
          formulaVersion: 'growth_rate_v1',
          sampleSize: filtered.length,
          capturedAt: streamer.verificationDate || null,
          freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate),
          limitations: [
            'Se requiere un mínimo de dos capturas temporales separadas dentro de la ventana de análisis.',
            'No se realizan interpolaciones ni proyecciones hipotéticas.',
          ],
          calculatedAt: new Date().toISOString(),
          isDemo,
        },
        limitations: [
          'Sin observaciones históricas suficientes en la ventana temporal seleccionada.',
        ],
      };
    }

    const firstSnap = filtered[0];
    const lastSnap = filtered[filtered.length - 1];

    const initialVal = firstSnap.followers;
    const finalVal = streamer.followers.value ?? lastSnap.followers;

    const growth = MetricCalculator.calculateGrowth(initialVal, finalVal);

    const provenance: MetricProvenance = {
      source: streamer.source,
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: {
        initialObservationDate: firstSnap.date,
        initialFollowers: initialVal,
        finalObservationDate: streamer.verificationDate || lastSnap.date,
        finalFollowers: finalVal,
      },
      period,
      formula: '((valor_final - valor_inicial) / valor_inicial) * 100',
      formulaVersion: 'growth_rate_v1',
      sampleSize: filtered.length,
      capturedAt: streamer.verificationDate || lastSnap.date,
      freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate || lastSnap.date),
      limitations: [
        'El cálculo solo computa variaciones entre puntos observados directamente.',
        'Si la base inicial es cero, el crecimiento porcentual no se computa.',
      ],
      calculatedAt: new Date().toISOString(),
      isDemo,
    };

    return {
      metricId: 'follower_growth_percentage',
      period,
      initialValue: initialVal,
      finalValue: finalVal,
      initialDate: firstSnap.date,
      finalDate: streamer.verificationDate || lastSnap.date,
      absoluteChange: growth.absoluteChange,
      percentageChange: growth.percentageChange,
      formattedPercentage: growth.displayText,
      trend: growth.trend,
      sampleSize: filtered.length,
      status: growth.status === 'AVAILABLE' ? 'AVAILABLE' : 'NO_DISPONIBLE',
      statusReason: growth.reason,
      formulaVersion: 'growth_rate_v1',
      provenance,
      limitations: [
        'Crecimiento calculado únicamente sobre la muestra disponible en el rango temporal.',
      ],
    };
  }
}
