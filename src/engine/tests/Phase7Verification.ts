/**
 * KICK ANALYTICS MX — Phase 7 Automated Test & Verification Suite
 * Valida de forma determinista todas las reglas estadísticas, matemáticas,
 * de integridad, procedencia, proveniencia y compliance.
 */

import { MetricCalculator } from '../analytics/MetricCalculator';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { MetricRegistry } from '../analytics/MetricRegistry';
import { PublicationGuard } from '../compliance/PublicationGuard';
import { Streamer, ChannelSnapshot } from '../../types';

export interface Phase7TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export class Phase7Verification {
  private static analytics = new AnalyticsEngine();
  private static guard = PublicationGuard.getInstance();

  public static runAllTests(): {
    total: number;
    passed: number;
    failed: number;
    allPassed: boolean;
    results: Phase7TestResult[];
  } {
    const results: Phase7TestResult[] = [];

    // TEST 1: Positive Growth (100 -> 120 = +20%)
    const gPos = MetricCalculator.calculateGrowth(100, 120);
    results.push({
      suiteName: 'Matemática & Crecimiento',
      testName: 'Crecimiento Positivo (+20%)',
      passed: gPos.percentageChange === 20.0 && gPos.displayText === '+20.0%',
      expected: '+20.0%',
      actual: gPos.displayText,
    });

    // TEST 2: Negative Growth (120 -> 100 = -16.67%)
    const gNeg = MetricCalculator.calculateGrowth(120, 100);
    results.push({
      suiteName: 'Matemática & Crecimiento',
      testName: 'Crecimiento Negativo (-16.67%)',
      passed: gNeg.percentageChange === -16.67 && gNeg.displayText === '-16.67%',
      expected: '-16.67%',
      actual: gNeg.displayText,
    });

    // TEST 3: Zero Denominator (0 -> 50 = NO DISPONIBLE)
    const gZero = MetricCalculator.calculateGrowth(0, 50);
    results.push({
      suiteName: 'Matemática & Crecimiento',
      testName: 'Denominador Cero (División por cero prevenida)',
      passed: gZero.percentageChange === null && gZero.status === 'NO_DISPONIBLE',
      expected: 'NO DISPONIBLE',
      actual: gZero.displayText,
      details: gZero.reason,
    });

    // TEST 4: Missing Data (null -> 100 = NO DISPONIBLE)
    const gMissing = MetricCalculator.calculateGrowth(null, 100);
    results.push({
      suiteName: 'Integridad de Datos',
      testName: 'Dato Faltante (NO DISPONIBLE)',
      passed: gMissing.status === 'NO_DISPONIBLE' && gMissing.percentageChange === null,
      expected: 'NO DISPONIBLE',
      actual: gMissing.displayText,
    });

    // TEST 5: Ratio Viewers / Followers (100 viewers / 1000 followers = 0.1)
    const ratioRes = MetricCalculator.calculateRatio(100, 1000);
    results.push({
      suiteName: 'Métricas Calculadas',
      testName: 'Ratio Viewers / Followers',
      passed: ratioRes.ratio === 0.1 && ratioRes.status === 'AVAILABLE',
      expected: '0.100',
      actual: String(ratioRes.ratio),
    });

    // TEST 6: Ratio Denominator Zero (100 / 0 = NO DISPONIBLE)
    const ratioZero = MetricCalculator.calculateRatio(100, 0);
    results.push({
      suiteName: 'Métricas Calculadas',
      testName: 'Ratio Denominador Cero',
      passed: ratioZero.status === 'NO_DISPONIBLE' && ratioZero.ratio === null,
      expected: 'NO DISPONIBLE',
      actual: ratioZero.displayText,
    });

    // TEST 7: Mediana Muestra Impar [10, 20, 30] -> 20
    const medOdd = MetricCalculator.calculateMedian([10, 30, 20]);
    results.push({
      suiteName: 'Estadística Descriptiva',
      testName: 'Mediana Muestra Impar',
      passed: medOdd === 20,
      expected: '20',
      actual: String(medOdd),
    });

    // TEST 8: Mediana Muestra Par [10, 20, 30, 40] -> 25
    const medEven = MetricCalculator.calculateMedian([10, 40, 20, 30]);
    results.push({
      suiteName: 'Estadística Descriptiva',
      testName: 'Mediana Muestra Par',
      passed: medEven === 25,
      expected: '25',
      actual: String(medEven),
    });

    // TEST 9: Detección de Anomalías (MAD) - Valor Normal dentro de rango
    const seriesNormal = [100, 102, 98, 101, 99, 100];
    const anomNormal = MetricCalculator.detectAnomalyMAD(seriesNormal, 103);
    results.push({
      suiteName: 'Detección de Anomalías (MAD)',
      testName: 'Valor Regular (No es anomalía)',
      passed: !anomNormal.isAnomaly,
      expected: 'isAnomaly: false',
      actual: `isAnomaly: ${anomNormal.isAnomaly}`,
    });

    // TEST 10: Detección de Anomalías (MAD) - Outlier
    const anomOutlier = MetricCalculator.detectAnomalyMAD(seriesNormal, 500);
    results.push({
      suiteName: 'Detección de Anomalías (MAD)',
      testName: 'Outlier Detectado con Neutral Disclaimer',
      passed: anomOutlier.isAnomaly && anomOutlier.reason.includes('No se determina la causa'),
      expected: 'isAnomaly: true (con disclaimer neutral)',
      actual: `isAnomaly: ${anomOutlier.isAnomaly}`,
      details: anomOutlier.reason,
    });

    // TEST 11: Detección de Anomalías - Muestra Insuficiente (n < 4)
    const anomShort = MetricCalculator.detectAnomalyMAD([100, 105], 300);
    results.push({
      suiteName: 'Detección de Anomalías (MAD)',
      testName: 'Muestra Insuficiente (n < 4)',
      passed: !anomShort.isAnomaly && anomShort.reason.includes('Muestra insuficiente'),
      expected: 'isAnomaly: false por muestra insuficiente',
      actual: anomShort.reason,
    });

    // TEST 12: Tendencia (Slope)
    const pointsUp = [
      { x: 0, y: 100 },
      { x: 1, y: 110 },
      { x: 2, y: 120 },
      { x: 3, y: 130 },
    ];
    const slopeUp = MetricCalculator.calculateSlope(pointsUp);
    results.push({
      suiteName: 'Análisis de Tendencias',
      testName: 'Pendiente Creciente (+10.0)',
      passed: slopeUp === 10,
      expected: '10',
      actual: String(slopeUp),
    });

    // TEST 13: Separación Estricta DEMO vs REAL (Produce ERROR DE INTEGRIDAD)
    let demoRealBlocked = false;
    try {
      const mockStreamer: any = {
        id: 'str-real-1',
        username: 'streamer_real',
        displayName: 'Streamer Real',
        followers: { value: 1000, period: '30d', source: 'KICK API' },
        avgViewers: { value: 200, period: '30d', source: 'KICK API' },
        peakViewers: { value: 500, period: '30d', source: 'KICK API' },
        hoursStreamed: { value: 50, period: '30d', source: 'KICK API' },
        primaryCategory: 'Gaming',
        categories: ['Gaming'],
        status: 'active',
        isDemo: false,
        source: 'api.kick.com',
        confidence: 'alta',
      };
      const mixedSnaps: ChannelSnapshot[] = [
        {
          id: 'snap-1',
          streamerId: 'str-real-1',
          date: '2026-09-01',
          period: '30d',
          followers: 800,
          avgViewers: 150,
          peakViewers: 300,
          hoursStreamed: 20,
          category: 'Gaming',
          source: 'DEMO MOCK GENERATOR',
          isDemo: true, // DEMO SNAPSHOT
        },
      ];
      this.analytics.getMetric('follower_growth_percentage', mockStreamer, mixedSnaps, '30d');
    } catch (err: any) {
      if (err.message.includes('ERROR DE INTEGRIDAD')) {
        demoRealBlocked = true;
      }
    }

    results.push({
      suiteName: 'Integridad & Separación DEMO/REAL',
      testName: 'Bloqueo Inmediato ante Mezcla DEMO y REAL',
      passed: demoRealBlocked,
      expected: 'Lanza ERROR DE INTEGRIDAD',
      actual: demoRealBlocked ? 'Lanzó ERROR DE INTEGRIDAD' : 'No bloqueó la mezcla',
    });

    // TEST 14: PublicationGuard - Bloqueo de Datos de API Expirados
    const pubCheckExpired = this.guard.canPublishMetric('KICK_API_DATA', true);
    results.push({
      suiteName: 'Compliance & Guardián de Publicación',
      testName: 'Bloqueo de Publicación de Datos API Expirados (>24h)',
      passed: !pubCheckExpired.canPublish && pubCheckExpired.reason.includes('expirado'),
      expected: 'canPublish: false',
      actual: `canPublish: ${pubCheckExpired.canPublish}`,
      details: pubCheckExpired.reason,
    });

    // TEST 15: Proveniencia Completa en Métricas Calculadas
    const allDefs = MetricRegistry.getCalculatedDefinitions();
    let allHaveProvenanceSpecs = true;
    for (const def of allDefs) {
      if (!def.formulaVersion || !def.formula || !def.requiredFields || !def.minimumSampleSize) {
        allHaveProvenanceSpecs = false;
        break;
      }
    }
    results.push({
      suiteName: 'Proveniencia y Auditoría',
      testName: 'Toda Métrica Calculada Posee Versión, Fórmula y Muestra Mínima',
      passed: allHaveProvenanceSpecs,
      expected: '100% de métricas calculadas con especificación completa',
      actual: allHaveProvenanceSpecs ? 'Completo y conforme' : 'Faltan campos de proveniencia',
    });

    const passedCount = results.filter((r) => r.passed).length;
    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      allPassed: passedCount === results.length,
      results,
    };
  }
}
