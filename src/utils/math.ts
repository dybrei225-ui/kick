import { GrowthIndicator, FreshnessInfo, DataFreshnessStatus } from '../types';

/**
 * Calculates mathematical growth between two numbers without subjective commentary.
 * Strictly adheres to rule:
 * - "+12.4%"
 * - "-4.7%"
 * - "Sin cambio significativo" (if between -0.5% and +0.5% or 0)
 * - "NO DISPONIBLE" / "Datos insuficientes" if any parameter is missing
 */
export function calculateGrowth(
  current: number | null | undefined,
  previous: number | null | undefined,
  periodLabel: string = '30 días'
): GrowthIndicator {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return {
      absoluteChange: null,
      percentageChange: null,
      periodText: periodLabel,
      displayText: 'No hay datos suficientes',
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
        displayText: 'Sin cambio significativo',
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

  const percentageChange = ((current - previous) / Math.abs(previous)) * 100;

  let trend: 'positive' | 'negative' | 'neutral' = 'neutral';
  let displayText = 'Sin cambio significativo';

  if (percentageChange > 0.5) {
    trend = 'positive';
    displayText = `+${percentageChange.toFixed(1)}%`;
  } else if (percentageChange < -0.5) {
    trend = 'negative';
    displayText = `${percentageChange.toFixed(1)}%`;
  } else {
    displayText = 'Sin cambio significativo';
  }

  return {
    absoluteChange,
    percentageChange,
    periodText: periodLabel,
    displayText,
    trend,
  };
}

export interface StreamerGrowthMetrics {
  growthFollowers: GrowthIndicator;
  growthAverageViewers: GrowthIndicator;
  growthHours: GrowthIndicator;
  growthStreams: GrowthIndicator;
}

export function calculateStreamerGrowthMetrics(
  currentStreamer: {
    followers?: { value: number | null };
    avgViewers?: { value: number | null };
    hoursStreamed?: { value: number | null };
    streamCount?: { value: number | null };
  },
  previousSnapshot: {
    followers?: number | null;
    avgViewers?: number | null;
    hoursStreamed?: number | null;
    streamCount?: number | null;
  } | null,
  periodLabel: string = '30 días'
): StreamerGrowthMetrics {
  const growthFollowers = calculateGrowth(
    currentStreamer.followers?.value,
    previousSnapshot?.followers,
    periodLabel
  );

  const growthAverageViewers = calculateGrowth(
    currentStreamer.avgViewers?.value,
    previousSnapshot?.avgViewers,
    periodLabel
  );

  const growthHours = calculateGrowth(
    currentStreamer.hoursStreamed?.value,
    previousSnapshot?.hoursStreamed,
    periodLabel
  );

  const growthStreams = calculateGrowth(
    currentStreamer.streamCount?.value ?? null,
    previousSnapshot?.streamCount ?? null,
    periodLabel
  );

  return {
    growthFollowers,
    growthAverageViewers,
    growthHours,
    growthStreams,
  };
}

/**
 * Requirement 26: Data Freshness
 * Calcula el estado de frescura del registro basado en días transcurridos.
 * Estados: ACTUALIZADO (<=3d), RECIENTE (4-14d), DESACTUALIZADO (15-60d), ANTIGUO (>60d), SIN DATOS.
 */
export function calculateFreshness(
  captureDateStr?: string | null,
  options?: { updatedThresholdDays?: number; recentThresholdDays?: number; staleThresholdDays?: number }
): FreshnessInfo {
  if (!captureDateStr || captureDateStr.trim() === '') {
    return {
      status: 'SIN DATOS',
      daysOld: 999,
      lastCaptureDate: 'Sin registro',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
  }

  const updatedThresh = options?.updatedThresholdDays ?? 3;
  const recentThresh = options?.recentThresholdDays ?? 14;
  const staleThresh = options?.staleThresholdDays ?? 60;

  try {
    const capture = new Date(captureDateStr);
    if (isNaN(capture.getTime())) {
      return {
        status: 'SIN DATOS',
        daysOld: 999,
        lastCaptureDate: captureDateStr,
        badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - capture.getTime();
    const daysOld = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let status: DataFreshnessStatus = 'ACTUALIZADO';
    let badgeClass = 'bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/30';

    if (daysOld <= updatedThresh) {
      status = 'ACTUALIZADO';
      badgeClass = 'bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/30';
    } else if (daysOld <= recentThresh) {
      status = 'RECIENTE';
      badgeClass = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    } else if (daysOld <= staleThresh) {
      status = 'DESACTUALIZADO';
      badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    } else {
      status = 'ANTIGUO';
      badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }

    return {
      status,
      daysOld,
      lastCaptureDate: captureDateStr.split('T')[0],
      badgeClass,
    };
  } catch {
    return {
      status: 'SIN DATOS',
      daysOld: 999,
      lastCaptureDate: captureDateStr,
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    };
  }
}

