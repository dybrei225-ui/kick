/**
 * KICK ANALYTICS MX — Metric Calculator
 * Motor matemático determinista, reproducible y auditable.
 * Regla de Oro: Prohibido inventar datos, prohibido dividir por cero, cero NaN/Infinity.
 */

export interface GrowthCalculationResult {
  absoluteChange: number | null;
  percentageChange: number | null;
  displayText: string;
  trend: 'CRECIMIENTO' | 'ESTABLE' | 'DESCENSO' | 'NO_DISPONIBLE';
  status: 'AVAILABLE' | 'NO_DISPONIBLE' | 'CALCULATION_ERROR';
  reason?: string;
}

export interface RatioCalculationResult {
  ratio: number | null;
  displayText: string;
  status: 'AVAILABLE' | 'NO_DISPONIBLE';
  reason?: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  expectedValue: number;
  expectedMin: number;
  expectedMax: number;
  deviationScore: number;
  method: 'MAD' | 'IQR' | 'Z_SCORE';
  reason: string;
}

export class MetricCalculator {
  /**
   * Fórmula central de crecimiento porcentual:
   * ((valor_final - valor_inicial) / valor_inicial) * 100
   * Si valor_inicial = 0: NO DISPONIBLE (Evitar división por cero).
   */
  public static calculateGrowth(
    initial: number | null | undefined,
    final: number | null | undefined
  ): GrowthCalculationResult {
    if (
      initial === null ||
      initial === undefined ||
      isNaN(initial) ||
      final === null ||
      final === undefined ||
      isNaN(final)
    ) {
      return {
        absoluteChange: null,
        percentageChange: null,
        displayText: 'NO DISPONIBLE',
        trend: 'NO_DISPONIBLE',
        status: 'NO_DISPONIBLE',
        reason: 'Valores iniciales o finales ausentes o no numéricos',
      };
    }

    const absoluteChange = final - initial;

    // Regla estricta contra división por cero
    if (initial === 0) {
      if (final === 0) {
        return {
          absoluteChange: 0,
          percentageChange: 0,
          displayText: '0.0%',
          trend: 'ESTABLE',
          status: 'AVAILABLE',
        };
      }
      return {
        absoluteChange,
        percentageChange: null,
        displayText: 'NO DISPONIBLE',
        trend: 'NO_DISPONIBLE',
        status: 'NO_DISPONIBLE',
        reason: 'Valor base inicial es 0; división por cero no permitida matemáticamente',
      };
    }

    const percentage = ((final - initial) / Math.abs(initial)) * 100;

    // Validación post-cálculo contra NaN o Infinity
    if (!isFinite(percentage) || isNaN(percentage)) {
      return {
        absoluteChange,
        percentageChange: null,
        displayText: 'NO DISPONIBLE',
        trend: 'NO_DISPONIBLE',
        status: 'CALCULATION_ERROR',
        reason: 'Error aritmético en cálculo de tasa',
      };
    }

    const roundedPercentage = Number(percentage.toFixed(2));
    let trend: 'CRECIMIENTO' | 'ESTABLE' | 'DESCENSO' = 'ESTABLE';
    let displayText = '0.0%';

    if (roundedPercentage > 0.05) {
      trend = 'CRECIMIENTO';
      displayText = `+${roundedPercentage.toFixed(1)}%`;
    } else if (roundedPercentage < -0.05) {
      trend = 'DESCENSO';
      displayText = `${roundedPercentage.toFixed(1)}%`;
    } else {
      trend = 'ESTABLE';
      displayText = '0.0%';
    }

    return {
      absoluteChange,
      percentageChange: roundedPercentage,
      displayText,
      trend,
      status: 'AVAILABLE',
    };
  }

  /**
   * Media aritmética de una muestra.
   */
  public static calculateAverage(values: (number | null | undefined)[]): number | null {
    const valid = values.filter(
      (v): v is number => v !== null && v !== undefined && !isNaN(v) && isFinite(v)
    );
    if (valid.length === 0) return null;

    const sum = valid.reduce((acc, val) => acc + val, 0);
    const avg = sum / valid.length;
    return isFinite(avg) && !isNaN(avg) ? Number(avg.toFixed(2)) : null;
  }

  /**
   * Mediana estadística robusta ante valores atípicos.
   * Maneja tanto muestras pares como impares.
   */
  public static calculateMedian(values: (number | null | undefined)[]): number | null {
    const valid = values
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v) && isFinite(v))
      .sort((a, b) => a - b);

    if (valid.length === 0) return null;

    const mid = Math.floor(valid.length / 2);
    if (valid.length % 2 !== 0) {
      return valid[mid];
    } else {
      const med = (valid[mid - 1] + valid[mid]) / 2;
      return Number(med.toFixed(2));
    }
  }

  /**
   * Ratio matemático entre numerador y denominador (ej: viewers / followers).
   * Prohíbe división por cero.
   */
  public static calculateRatio(
    numerator: number | null | undefined,
    denominator: number | null | undefined
  ): RatioCalculationResult {
    if (
      numerator === null ||
      numerator === undefined ||
      denominator === null ||
      denominator === undefined ||
      isNaN(numerator) ||
      isNaN(denominator)
    ) {
      return {
        ratio: null,
        displayText: 'NO DISPONIBLE',
        status: 'NO_DISPONIBLE',
        reason: 'Numerador o denominador no disponible',
      };
    }

    if (denominator === 0) {
      return {
        ratio: null,
        displayText: 'NO DISPONIBLE',
        status: 'NO_DISPONIBLE',
        reason: 'Denominador es 0; ratio no calculable',
      };
    }

    const ratio = numerator / denominator;
    if (!isFinite(ratio) || isNaN(ratio)) {
      return {
        ratio: null,
        displayText: 'NO DISPONIBLE',
        status: 'NO_DISPONIBLE',
        reason: 'Resultado no numérico',
      };
    }

    return {
      ratio: Number(ratio.toFixed(4)),
      displayText: ratio < 0.01 ? (ratio * 100).toFixed(2) + '%' : ratio.toFixed(3),
      status: 'AVAILABLE',
    };
  }

  /**
   * Pendiente de regresión lineal simple:
   * slope = cov(x, y) / var(x)
   */
  public static calculateSlope(points: { x: number; y: number }[]): number | null {
    if (points.length < 2) return null;

    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let numerator = 0;
    let denominator = 0;
    for (const p of points) {
      const diffX = p.x - meanX;
      numerator += diffX * (p.y - meanY);
      denominator += diffX * diffX;
    }

    if (denominator === 0) return 0;
    const slope = numerator / denominator;
    return isFinite(slope) && !isNaN(slope) ? Number(slope.toFixed(4)) : null;
  }

  /**
   * Cálculo de consistencia y regularidad observada basada en intervalos (en horas o días).
   * Mide dispersión matemática (coeficiente de variación).
   * NUNCA califica subjetivamente al streamer.
   */
  public static calculateConsistency(
    intervals: number[]
  ): { score: number | null; label: string; cv: number | null } {
    if (intervals.length < 3) {
      return { score: null, label: 'NO DISPONIBLE', cv: null };
    }

    const mean = MetricCalculator.calculateAverage(intervals);
    if (mean === null || mean === 0) {
      return { score: null, label: 'NO DISPONIBLE', cv: null };
    }

    let varianceSum = 0;
    for (const val of intervals) {
      varianceSum += Math.pow(val - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / intervals.length);
    const cv = stdDev / mean; // Coeficiente de variación

    // Mapear coeficiente de variación a escala 0 - 100 de regularidad
    const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, cv)) * 100)));

    let label = 'REGULARIDAD MEDIA';
    if (score >= 80) label = 'ALTA REGULARIDAD';
    else if (score < 50) label = 'ALTA DISPERSIÓN';

    return { score, label, cv: Number(cv.toFixed(2)) };
  }

  /**
   * Detección formal de anomalías estadísticas mediante Median Absolute Deviation (MAD) o IQR.
   * Regla de Oro: Una anomalía indica únicamente comportamiento inusual dentro de la muestra.
   * NUNCA implica acusación de fraude, bots o conducta indebida.
   */
  public static detectAnomalyMAD(
    series: number[],
    targetValue: number
  ): AnomalyDetectionResult {
    const valid = series.filter((v) => !isNaN(v) && isFinite(v));
    if (valid.length < 4) {
      return {
        isAnomaly: false,
        expectedValue: targetValue,
        expectedMin: targetValue,
        expectedMax: targetValue,
        deviationScore: 0,
        method: 'MAD',
        reason: 'Muestra insuficiente para detección formal de anomalía (n < 4)',
      };
    }

    const median = MetricCalculator.calculateMedian(valid) || 0;
    const absoluteDeviations = valid.map((v) => Math.abs(v - median));
    const mad = MetricCalculator.calculateMedian(absoluteDeviations) || 0;

    // Constante de consistencia para distribución normal: 1.4826
    const threshold = mad === 0 ? 0.001 : mad * 1.4826 * 2.5;
    const diff = Math.abs(targetValue - median);
    const deviationScore = mad === 0 ? 0 : Number((diff / (mad * 1.4826)).toFixed(2));

    const isAnomaly = diff > threshold && deviationScore >= 2.5;

    return {
      isAnomaly,
      expectedValue: median,
      expectedMin: Math.max(0, Number((median - threshold).toFixed(1))),
      expectedMax: Number((median + threshold).toFixed(1)),
      deviationScore,
      method: 'MAD',
      reason: isAnomaly
        ? 'El valor observado se encuentra fuera del rango habitual de la muestra analizada. No se determina la causa ni se infiere conducta indebida.'
        : 'Valor dentro del rango estadístico regular de la muestra.',
    };
  }
}
