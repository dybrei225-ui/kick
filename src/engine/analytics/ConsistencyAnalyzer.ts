/**
 * KICK ANALYTICS MX — Consistency Analyzer
 * Indicador de Regularidad Observada.
 * REGLA ABSOLUTA: Medir exclusivamente la regularidad matemática de los datos observados.
 * Prohibido calificar al streamer o usar términos como 'calidad del streamer' o 'esfuerzo'.
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { ConsistencyAnalysisResult, MetricProvenance } from './types';
import { MetricCalculator } from './MetricCalculator';
import { SnapshotManager } from '../SnapshotManager';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class ConsistencyAnalyzer {
  private static freshnessManager = new DataFreshnessManager();

  public static analyzeConsistency(
    streamer: Streamer,
    snapshots: ChannelSnapshot[]
  ): ConsistencyAnalysisResult {
    const sorted = SnapshotManager.sortSnapshots(snapshots);
    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);

    // Calcular intervalos entre fechas de emisión observadas (en días)
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i - 1].date).getTime();
      const t2 = new Date(sorted[i].date).getTime();
      const diffDays = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
      intervals.push(diffDays);
    }

    if (intervals.length < 3) {
      const provenance: MetricProvenance = {
        source: streamer.source,
        sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
        inputsUsed: { observationsCount: sorted.length, intervalsCalculated: intervals.length },
        period: 'historico',
        formula: '100 * (1 - min(1, stdDev(intervalos) / media(intervalos)))',
        formulaVersion: 'activity_consistency_v1',
        sampleSize: sorted.length,
        capturedAt: streamer.verificationDate || null,
        freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate),
        limitations: [
          'Requiere al menos 4 observaciones con marcas temporales válidas para calcular intervalos de regularidad.',
        ],
        calculatedAt: new Date().toISOString(),
        isDemo,
      };

      return {
        regularityScore: null,
        stabilityLabel: 'NO DISPONIBLE',
        coefficientOfVariation: null,
        observationsCount: sorted.length,
        neutralDescription:
          'Se requiere un mínimo de 4 observaciones cronológicas para calcular el indicador de regularidad observada.',
        status: 'INSUFFICIENT_DATA',
        provenance,
      };
    }

    const { score, label, cv } = MetricCalculator.calculateConsistency(intervals);

    let stabilityLabel: 'ALTA REGULARIDAD' | 'REGULARIDAD MEDIA' | 'ALTA DISPERSIÓN' | 'NO DISPONIBLE' =
      'NO DISPONIBLE';
    if (label === 'ALTA REGULARIDAD') stabilityLabel = 'ALTA REGULARIDAD';
    else if (label === 'REGULARIDAD MEDIA') stabilityLabel = 'REGULARIDAD MEDIA';
    else if (label === 'ALTA DISPERSIÓN') stabilityLabel = 'ALTA DISPERSIÓN';

    const provenance: MetricProvenance = {
      source: streamer.source,
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: {
        intervalsCount: intervals.length,
        intervalsSample: intervals.slice(0, 5).join(', '),
        coefficientOfVariation: cv,
      },
      period: 'historico',
      formula: '100 * (1 - min(1, stdDev(intervalos) / media(intervalos)))',
      formulaVersion: 'activity_consistency_v1',
      sampleSize: sorted.length,
      capturedAt: streamer.verificationDate || sorted[sorted.length - 1].date,
      freshnessStatus: this.freshnessManager.evaluateFreshness(streamer.verificationDate),
      limitations: [
        'Mide exclusivamente la variabilidad en los intervalos de emisión registrados.',
        'No constituye una valoración cualitativa o subjetiva del creador.',
      ],
      calculatedAt: new Date().toISOString(),
      isDemo,
    };

    return {
      regularityScore: score,
      stabilityLabel,
      coefficientOfVariation: cv,
      observationsCount: sorted.length,
      neutralDescription:
        'Indicador de regularidad observada en los intervalos de emisión documentados. Refleja la estabilidad matemática del calendario en la muestra analizada.',
      status: score !== null ? 'AVAILABLE' : 'CALCULATION_ERROR',
      provenance,
    };
  }
}
