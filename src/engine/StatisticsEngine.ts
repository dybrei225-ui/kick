/**
 * KICK ANALYTICS MX — Data Engine: Statistics Engine
 * Motor de cálculo estadístico transparente.
 * Regla matemática: Crecimiento = ((actual - anterior) / anterior) * 100
 * Si anterior es 0 o nulo, se reporta 'NO DISPONIBLE' o cambio absoluto.
 */

import { ChannelSnapshot, GrowthIndicator, Streamer } from '../types';
import { SnapshotManager } from './SnapshotManager';

export interface MetricComparison {
  metricName: string;
  metricType: 'OBSERVADO' | 'CALCULADO';
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  formattedChange: string;
  trend: 'positive' | 'negative' | 'neutral' | 'no_data';
  periodLabel: string;
}

export interface ActivityVarianceReport {
  streamsCurrent: number | null;
  streamsPrevious: number | null;
  streamsGrowth: GrowthIndicator;
  hoursCurrent: number | null;
  hoursPrevious: number | null;
  hoursGrowth: GrowthIndicator;
  avgHoursPerStream: number | null;
  streamingFrequencyText: string;
}

export interface TemporalComparisonResult {
  period: '7d' | '30d' | '90d' | '6m' | '1a' | 'historico';
  currentDate: string;
  previousDate: string;
  followers: MetricComparison;
  avgViewers: MetricComparison;
  peakViewers: MetricComparison;
  hoursStreamed: MetricComparison;
  streamsCount: MetricComparison;
  activityVariance: ActivityVarianceReport;
}

export class StatisticsEngine {
  /**
   * Fórmula central: ((actual - anterior) / anterior) * 100
   */
  public static calculateGrowth(
    current: number | null | undefined,
    previous: number | null | undefined,
    periodLabel: string = '30 días'
  ): GrowthIndicator {
    if (current === null || current === undefined || previous === null || previous === undefined) {
      return {
        absoluteChange: null,
        percentageChange: null,
        periodText: periodLabel,
        displayText: 'NO DISPONIBLE',
        trend: 'no_data',
      };
    }

    const absoluteChange = current - previous;

    if (previous === 0) {
      if (current === 0) {
        return {
          absoluteChange: 0,
          percentageChange: 0,
          periodText: periodLabel,
          displayText: 'Sin variación (0%)',
          trend: 'neutral',
        };
      }
      return {
        absoluteChange,
        percentageChange: 100,
        periodText: periodLabel,
        displayText: `+100.0%`,
        trend: 'positive',
      };
    }

    const percentage = ((current - previous) / Math.abs(previous)) * 100;
    let trend: 'positive' | 'negative' | 'neutral' = 'neutral';
    let displayText = 'Sin variación';

    if (percentage > 0.05) {
      trend = 'positive';
      displayText = `+${percentage.toFixed(1)}%`;
    } else if (percentage < -0.05) {
      trend = 'negative';
      displayText = `${percentage.toFixed(1)}%`;
    } else {
      displayText = '0.0%';
    }

    return {
      absoluteChange,
      percentageChange: Number(percentage.toFixed(2)),
      periodText: periodLabel,
      displayText,
      trend,
    };
  }

  /**
   * Realiza la comparación entre dos valores para una métrica específica
   */
  public static compareMetric(
    metricName: string,
    metricType: 'OBSERVADO' | 'CALCULADO',
    current: number | null | undefined,
    previous: number | null | undefined,
    periodLabel: string
  ): MetricComparison {
    const growth = this.calculateGrowth(current, previous, periodLabel);
    return {
      metricName,
      metricType,
      currentValue: current !== undefined ? current : null,
      previousValue: previous !== undefined ? previous : null,
      absoluteChange: growth.absoluteChange,
      percentageChange: growth.percentageChange,
      formattedChange: growth.displayText,
      trend: growth.trend,
      periodLabel,
    };
  }

  /**
   * Compara los datos actuales de un streamer con una instantánea anterior para un periodo dado
   */
  public static compareStreamerPeriod(
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: '7d' | '30d' | '90d' | '6m' | '1a' | 'historico'
  ): TemporalComparisonResult {
    const filtered = SnapshotManager.filterByPeriod(snapshots, period);
    const sorted = SnapshotManager.sortSnapshots(filtered);

    // Captura actual: la última del histórico o los valores del streamer
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    // Captura anterior: la primera del rango filtrado
    const previous = sorted.length > 1 ? sorted[0] : null;

    const currFollowers = streamer.followers.value ?? latest?.followers ?? null;
    const prevFollowers = previous?.followers ?? null;

    const currAvgViewers = streamer.avgViewers.value ?? latest?.avgViewers ?? null;
    const prevAvgViewers = previous?.avgViewers ?? null;

    const currPeak = streamer.peakViewers.value ?? latest?.peakViewers ?? null;
    const prevPeak = previous?.peakViewers ?? null;

    const currHours = streamer.hoursStreamed.value ?? latest?.hoursStreamed ?? null;
    const prevHours = previous?.hoursStreamed ?? null;

    const currStreams = streamer.streamCount?.value ?? latest?.streamCount ?? null;
    const prevStreams = previous?.streamCount ?? null;

    const periodLabelMap: Record<string, string> = {
      '7d': 'Últimos 7 días',
      '30d': 'Últimos 30 días',
      '90d': 'Últimos 90 días',
      '6m': 'Últimos 6 meses',
      '1a': 'Último año',
      'historico': 'Histórico acumulado',
    };
    const periodLabel = periodLabelMap[period] || period;

    const hoursGrowth = this.calculateGrowth(currHours, prevHours, periodLabel);
    const streamsGrowth = this.calculateGrowth(currStreams, prevStreams, periodLabel);

    let avgHoursPerStream: number | null = null;
    if (currHours !== null && currStreams !== null && currStreams > 0) {
      avgHoursPerStream = Number((currHours / currStreams).toFixed(1));
    }

    let freqText = 'Frecuencia no disponible';
    if (currStreams !== null) {
      freqText = `${currStreams} transmisiones en el periodo`;
    }

    return {
      period,
      currentDate: streamer.verificationDate || latest?.date || 'Fecha actual',
      previousDate: previous?.date || 'Sin registro previo',
      followers: this.compareMetric('Seguidores', 'OBSERVADO', currFollowers, prevFollowers, periodLabel),
      avgViewers: this.compareMetric('Audiencia promedio', 'CALCULADO', currAvgViewers, prevAvgViewers, periodLabel),
      peakViewers: this.compareMetric('Pico de audiencia', 'OBSERVADO', currPeak, prevPeak, periodLabel),
      hoursStreamed: this.compareMetric('Horas transmitidas', 'CALCULADO', currHours, prevHours, periodLabel),
      streamsCount: this.compareMetric('Transmisiones', 'OBSERVADO', currStreams, prevStreams, periodLabel),
      activityVariance: {
        streamsCurrent: currStreams,
        streamsPrevious: prevStreams,
        streamsGrowth,
        hoursCurrent: currHours,
        hoursPrevious: prevHours,
        hoursGrowth,
        avgHoursPerStream,
        streamingFrequencyText: freqText,
      },
    };
  }
}
