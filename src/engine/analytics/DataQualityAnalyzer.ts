/**
 * KICK ANALYTICS MX — Data Quality Analyzer
 * Evalúa el Data Quality Score del registro.
 * REGLA ESTRICTA: Este indicador mide la calidad de los datos disponibles, NO la calidad del streamer.
 */

import { Streamer, ChannelSnapshot } from '../../types';
import { MetricQuality } from './types';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class DataQualityAnalyzer {
  private static freshnessManager = new DataFreshnessManager();

  public static evaluateQuality(
    streamer: Streamer,
    snapshots: ChannelSnapshot[]
  ): MetricQuality {
    let score = 0;

    // 1. Completitud de Campos (Máx 35 pts)
    let completenessPts = 0;
    if (streamer.followers.value !== null && streamer.followers.value !== undefined) completenessPts += 10;
    if (streamer.avgViewers.value !== null && streamer.avgViewers.value !== undefined) completenessPts += 10;
    if (streamer.peakViewers.value !== null && streamer.peakViewers.value !== undefined) completenessPts += 5;
    if (streamer.hoursStreamed.value !== null && streamer.hoursStreamed.value !== undefined) completenessPts += 5;
    if (streamer.streamCount?.value !== null && streamer.streamCount?.value !== undefined) completenessPts += 5;
    score += completenessPts;

    // 2. Vigencia y Frescura (Máx 35 pts)
    const freshnessStatus = this.freshnessManager.evaluateFreshness(streamer.verificationDate);
    let freshnessPts = 0;
    if (freshnessStatus === 'FRESH') freshnessPts = 35;
    else if (freshnessStatus === 'AGING') freshnessPts = 25;
    else if (freshnessStatus === 'STALE') freshnessPts = 10;
    else if (freshnessStatus === 'EXPIRED') freshnessPts = 0;
    else freshnessPts = 5;
    score += freshnessPts;

    // 3. Verificación de Fuente (Máx 15 pts)
    const hasValidSource = Boolean(streamer.source && streamer.source.trim() !== '');
    const isRestricted = freshnessStatus === 'EXPIRED';
    if (hasValidSource) score += 15;

    // 4. Cobertura Temporal de Muestra (Máx 15 pts)
    const sampleSufficiency = snapshots.length >= 2;
    if (snapshots.length >= 4) score += 15;
    else if (snapshots.length >= 2) score += 10;
    else if (snapshots.length === 1) score += 5;

    const normalizedScore = Math.max(0, Math.min(100, score));

    let label: 'ALTA' | 'MEDIA' | 'BAJA' | 'DEFICIENTE' = 'DEFICIENTE';
    if (normalizedScore >= 80) label = 'ALTA';
    else if (normalizedScore >= 60) label = 'MEDIA';
    else if (normalizedScore >= 40) label = 'BAJA';

    return {
      completenessScore: Math.round((completenessPts / 35) * 100),
      freshnessStatus,
      hasValidSource,
      isRestricted,
      sampleSufficiency,
      score: normalizedScore,
      label,
      description:
        'Este indicador mide única y exclusivamente la integridad, vigencia y completitud de los datos disponibles, no la calidad del streamer.',
    };
  }
}
