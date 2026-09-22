/**
 * KICK ANALYTICS MX — Category Analyzer
 * Análisis cuantitativo de categorías por muestra disponible y cobertura conocida.
 * REGLA ABSOLUTA: Nunca afirmar que representa a la totalidad de KICK global.
 */

import { Streamer, CategoryData } from '../../types';
import { CategoryAnalysisResult, MetricProvenance } from './types';
import { MetricCalculator } from './MetricCalculator';

export class CategoryAnalyzer {
  public static analyzeCategory(
    categoryName: string,
    streamers: Streamer[]
  ): CategoryAnalysisResult {
    const matching = streamers.filter(
      (s) =>
        s.primaryCategory.toLowerCase() === categoryName.toLowerCase() ||
        s.categories.some((c) => c.toLowerCase() === categoryName.toLowerCase())
    );

    const isDemo = matching.some((s) => s.isDemo);

    const viewersList = matching
      .map((s) => s.avgViewers.value)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    const aggregateAudience = viewersList.reduce((acc, v) => acc + v, 0);
    const avgAudience = MetricCalculator.calculateAverage(viewersList);
    const medianAudience = MetricCalculator.calculateMedian(viewersList);

    const peaksList = matching
      .map((s) => s.peakViewers.value)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    const peakAudienceObserved = peaksList.length > 0 ? Math.max(...peaksList) : null;

    const streamsObserved = matching.reduce(
      (acc, s) => acc + (s.streamCount?.value || 0),
      0
    );

    const topChannels = [...matching]
      .sort((a, b) => (b.followers.value || 0) - (a.followers.value || 0))
      .slice(0, 5)
      .map((s) => ({
        username: s.username,
        followers: s.followers.value,
        avgViewers: s.avgViewers.value,
      }));

    const provenance: MetricProvenance = {
      source: 'Muestra de Canales Auditados en KICK Analytics MX',
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: {
        categoryQuery: categoryName,
        channelsInSample: matching.length,
        viewersObservations: viewersList.length,
      },
      period: 'corte_actual',
      formula: 'Agregaciones matemáticas estándar (media, mediana, suma y máximo)',
      formulaVersion: 'category_analysis_v1',
      sampleSize: matching.length,
      capturedAt: new Date().toISOString(),
      freshnessStatus: 'FRESH',
      limitations: [
        'Los datos representan exclusivamente los canales incluidos en la muestra auditada del sistema.',
        'No representan la totalidad global de creadores que transmiten en esta categoría en KICK.',
      ],
      calculatedAt: new Date().toISOString(),
      isDemo,
    };

    return {
      categoryName,
      knownChannelsCount: matching.length,
      streamsObservedCount: streamsObserved,
      aggregateAudience: viewersList.length > 0 ? aggregateAudience : null,
      averageAudience: avgAudience,
      medianAudience: medianAudience,
      peakAudienceObserved,
      topChannelsInSample: topChannels,
      sampleCoverageLabel: 'MUESTRA DISPONIBLE (COBERTURA CONOCIDA)',
      limitations: [
        'Los valores corresponden únicamente a los canales monitoreados y verificados.',
        'La rotación de categorías en streamers multitemáticos puede alterar la muestra observada.',
      ],
      provenance,
    };
  }

  public static analyzeAllCategories(
    categories: CategoryData[],
    streamers: Streamer[]
  ): CategoryAnalysisResult[] {
    return categories.map((c) => this.analyzeCategory(c.name, streamers));
  }
}
