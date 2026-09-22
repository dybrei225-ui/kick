/**
 * KICK ANALYTICS MX — CENTRAL ANALYTICS ENGINE
 * Orquestador principal del pipeline analítico determinista:
 * REQUEST METRIC -> CHECK DEFINITION -> CHECK SOURCE -> CHECK DATA TYPE ->
 * CHECK FRESHNESS -> CHECK REQUIRED INPUTS -> CHECK SAMPLE SIZE -> CHECK POLICY ->
 * CALCULATE -> VALIDATE RESULT -> CREATE PROVENANCE -> RETURN METRIC RESULT.
 */

import { Streamer, ChannelSnapshot } from '../../types';
import {
  MetricResult,
  MetricDefinition,
  AnalyticalPeriod,
  MetricProvenance,
  MetricQuality,
  AnalyticsAuditRecord,
} from './types';
import { MetricRegistry } from './MetricRegistry';
import { MetricCalculator } from './MetricCalculator';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { GrowthAnalyzer } from './GrowthAnalyzer';
import { TrendAnalyzer } from './TrendAnalyzer';
import { ActivityAnalyzer } from './ActivityAnalyzer';
import { ConsistencyAnalyzer } from './ConsistencyAnalyzer';
import { AnomalyDetectorEngine } from './AnomalyDetectorEngine';
import { ComparisonEngine } from './ComparisonEngine';
import { CategoryAnalyzer } from './CategoryAnalyzer';
import { AnalyticsReportEngine } from './AnalyticsReportEngine';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';
import { PublicationGuard } from '../compliance/PublicationGuard';
import { KickDataPolicy } from '../compliance/KickDataPolicy';

export class AnalyticsEngine {
  private freshnessManager: DataFreshnessManager;
  private publicationGuard: PublicationGuard;
  private dataPolicy: KickDataPolicy;
  private calculationAuditLog: AnalyticsAuditRecord[] = [];
  private cache: Map<string, { result: MetricResult; cachedAt: number }> = new Map();
  private static CACHE_TTL_MS = 30000; // 30 segundos en memoria volátil

  constructor() {
    this.freshnessManager = DataFreshnessManager.getInstance();
    this.publicationGuard = PublicationGuard.getInstance();
    this.dataPolicy = KickDataPolicy.getInstance();
  }

  // Delegados de acceso a submódulos
  public get registry() {
    return MetricRegistry;
  }
  public get calculator() {
    return MetricCalculator;
  }
  public get growth() {
    return GrowthAnalyzer;
  }
  public get trend() {
    return TrendAnalyzer;
  }
  public get activity() {
    return ActivityAnalyzer;
  }
  public get consistency() {
    return ConsistencyAnalyzer;
  }
  public get anomaly() {
    return AnomalyDetectorEngine;
  }
  public get comparison() {
    return ComparisonEngine;
  }
  public get category() {
    return CategoryAnalyzer;
  }
  public get reports() {
    return AnalyticsReportEngine;
  }

  /**
   * Pipeline Central: Ejecuta el cálculo de una métrica individual siguiendo todas las validaciones.
   */
  public getMetric(
    metricId: string,
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: AnalyticalPeriod = '30d'
  ): MetricResult {
    const cacheKey = `${metricId}:${streamer.id}:${period}:${streamer.followers.value}:${snapshots.length}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < AnalyticsEngine.CACHE_TTL_MS) {
      return cached.result;
    }

    const calculatedResult = this.executeMetricPipeline(metricId, streamer, snapshots, period);
    this.cache.set(cacheKey, { result: calculatedResult, cachedAt: Date.now() });

    // Registro de auditoría
    this.logAudit({
      id: `audit-calc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      metricId,
      streamerId: streamer.id,
      period,
      formulaVersion: calculatedResult.formulaVersion,
      sampleSize: calculatedResult.sampleSize,
      sourceType: calculatedResult.provenance.sourceType,
      status: calculatedResult.status,
    });

    return calculatedResult;
  }

  private executeMetricPipeline(
    metricId: string,
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: AnalyticalPeriod
  ): MetricResult {
    // 1. CHECK DEFINITION
    const def = MetricRegistry.getDefinition(metricId);
    if (!def) {
      return this.createErrorResult(
        metricId,
        'CALCULATION_ERROR',
        `Definición no encontrada para métrica ${metricId}`,
        streamer
      );
    }

    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);
    const hasReal = !streamer.isDemo && snapshots.some((s) => !s.isDemo);
    const hasDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);

    // 2. CHECK DATA TYPE — Anti-mezcla estricta
    if (hasReal && hasDemo && !streamer.isDemo && snapshots.some((s) => s.isDemo)) {
      throw new Error(
        'ERROR DE INTEGRIDAD: Mezcla no autorizada entre datos DEMO y datos REALES en motor analítico.'
      );
    }

    // 3. CHECK FRESHNESS
    const freshness = this.freshnessManager.evaluateFreshness(streamer.verificationDate);

    // 4. CHECK POLICY — Si es dato de API y está expirado, prohibir cálculo de métrica pública
    if (!isDemo && freshness === 'EXPIRED') {
      return this.createExpiredResult(def, streamer, period, freshness);
    }

    // 5. CHECK REQUIRED INPUTS & SAMPLE SIZE
    const quality = DataQualityAnalyzer.evaluateQuality(streamer, snapshots);

    // Dispatcher por ID de métrica
    switch (metricId) {
      case 'current_followers': {
        const val = streamer.followers.value;
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: val,
          formattedValue: val !== null ? val.toLocaleString('es-MX') : 'NO DISPONIBLE',
          type: 'OBSERVADO',
          status: val !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
          statusReason: val === null ? 'Seguidores no disponibles en el registro' : undefined,
          period: 'corte_actual',
          sampleSize: 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(def, streamer, period, { followers: val }, 1, freshness, isDemo),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'current_viewers': {
        const val = streamer.avgViewers?.period === 'En vivo' ? streamer.avgViewers.value : null;
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: val,
          formattedValue: val !== null ? val.toLocaleString('es-MX') : 'NO DISPONIBLE',
          type: 'OBSERVADO',
          status: val !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
          statusReason: val === null ? 'Canal fuera de transmisión en vivo' : undefined,
          period: 'tiempo_real',
          sampleSize: 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(def, streamer, period, { currentViewers: val }, 1, freshness, isDemo),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'follower_growth_percentage': {
        const growth = GrowthAnalyzer.analyzeFollowerGrowth(streamer, snapshots, period);
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: growth.percentageChange,
          formattedValue: growth.formattedPercentage,
          type: 'CALCULADO',
          status: growth.status,
          statusReason: growth.statusReason,
          period,
          sampleSize: growth.sampleSize,
          formulaVersion: def.formulaVersion,
          provenance: growth.provenance,
          quality,
          limitations: growth.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'follower_growth_absolute': {
        const growth = GrowthAnalyzer.analyzeFollowerGrowth(streamer, snapshots, period);
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: growth.absoluteChange,
          formattedValue:
            growth.absoluteChange !== null
              ? (growth.absoluteChange > 0 ? `+` : '') + growth.absoluteChange.toLocaleString('es-MX')
              : 'NO DISPONIBLE',
          type: 'CALCULADO',
          status: growth.status,
          statusReason: growth.statusReason,
          period,
          sampleSize: growth.sampleSize,
          formulaVersion: def.formulaVersion,
          provenance: growth.provenance,
          quality,
          limitations: growth.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'viewer_follower_ratio': {
        const ratioRes = MetricCalculator.calculateRatio(
          streamer.avgViewers.value,
          streamer.followers.value
        );
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: ratioRes.ratio,
          formattedValue: ratioRes.displayText,
          type: 'CALCULADO',
          status: ratioRes.status,
          statusReason: ratioRes.reason,
          period: 'corte_actual',
          sampleSize: 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(
            def,
            streamer,
            period,
            { viewers: streamer.avgViewers.value, followers: streamer.followers.value },
            1,
            freshness,
            isDemo
          ),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'average_viewers': {
        const val = streamer.avgViewers.value;
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: val,
          formattedValue: val !== null ? val.toLocaleString('es-MX') : 'NO DISPONIBLE',
          type: 'CALCULADO',
          status: val !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
          statusReason: val === null ? 'Audiencia promedio no disponible en registros' : undefined,
          period: 'muestra',
          sampleSize: snapshots.length || 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(def, streamer, period, { avgViewers: val }, snapshots.length || 1, freshness, isDemo),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'median_viewers': {
        const viewersList = snapshots
          .map((s) => s.avgViewers)
          .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        if (viewersList.length < def.minimumSampleSize) {
          return {
            metricId,
            name: def.name,
            shortLabel: def.shortLabel,
            value: null,
            formattedValue: 'NO DISPONIBLE',
            type: 'CALCULADO',
            status: 'INSUFFICIENT_DATA',
            statusReason: `Muestra insuficiente para calcular mediana (disponible: ${viewersList.length}, mínimo requerido: ${def.minimumSampleSize})`,
            period: 'muestra',
            sampleSize: viewersList.length,
            formulaVersion: def.formulaVersion,
            provenance: this.buildProvenance(def, streamer, period, { observations: viewersList.length }, viewersList.length, freshness, isDemo),
            quality,
            limitations: def.limitations,
            calculatedAt: new Date().toISOString(),
          };
        }

        const med = MetricCalculator.calculateMedian(viewersList);
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: med,
          formattedValue: med !== null ? med.toLocaleString('es-MX') : 'NO DISPONIBLE',
          type: 'CALCULADO',
          status: med !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
          period: 'muestra',
          sampleSize: viewersList.length,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(def, streamer, period, { sampleSize: viewersList.length }, viewersList.length, freshness, isDemo),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'peak_viewers': {
        const val = streamer.peakViewers.value;
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: val,
          formattedValue: val !== null ? val.toLocaleString('es-MX') : 'NO DISPONIBLE',
          type: 'OBSERVADO',
          status: val !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
          period: 'muestra',
          sampleSize: 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(def, streamer, period, { peakViewers: val }, 1, freshness, isDemo),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'stream_count': {
        const act = ActivityAnalyzer.analyzeActivity(streamer, snapshots, period);
        return act.streamCount;
      }

      case 'stream_frequency': {
        const act = ActivityAnalyzer.analyzeActivity(streamer, snapshots, period);
        return act.streamFrequency;
      }

      case 'stream_duration': {
        const act = ActivityAnalyzer.analyzeActivity(streamer, snapshots, period);
        return act.durationAverage;
      }

      case 'activity_days': {
        const act = ActivityAnalyzer.analyzeActivity(streamer, snapshots, period);
        return act.activeDays;
      }

      case 'activity_consistency': {
        const con = ConsistencyAnalyzer.analyzeConsistency(streamer, snapshots);
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: con.regularityScore,
          formattedValue:
            con.regularityScore !== null
              ? `${con.regularityScore}% (${con.stabilityLabel})`
              : 'NO DISPONIBLE',
          type: 'CALCULADO',
          status: con.status,
          statusReason: con.neutralDescription,
          period: 'historico',
          sampleSize: con.observationsCount,
          formulaVersion: def.formulaVersion,
          provenance: con.provenance,
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'trend_slope': {
        const tr = TrendAnalyzer.analyzeTrend(streamer, snapshots, period);
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: tr.slope,
          formattedValue: tr.formattedSlope,
          type: 'CALCULADO',
          status: tr.status,
          statusReason: tr.statusReason,
          period,
          sampleSize: tr.observationsCount,
          formulaVersion: def.formulaVersion,
          provenance: tr.provenance,
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      case 'data_quality': {
        return {
          metricId,
          name: def.name,
          shortLabel: def.shortLabel,
          value: quality.score,
          formattedValue: `${quality.score} / 100 (${quality.label})`,
          type: 'CALCULADO',
          status: 'AVAILABLE',
          period: 'auditoria',
          sampleSize: snapshots.length || 1,
          formulaVersion: def.formulaVersion,
          provenance: this.buildProvenance(
            def,
            streamer,
            period,
            { completeness: quality.completenessScore, freshness: quality.freshnessStatus },
            snapshots.length || 1,
            freshness,
            isDemo
          ),
          quality,
          limitations: def.limitations,
          calculatedAt: new Date().toISOString(),
        };
      }

      default:
        return this.createErrorResult(metricId, 'NO_DISPONIBLE', 'Métrica no implementada en este entorno', streamer);
    }
  }

  private buildProvenance(
    def: MetricDefinition,
    streamer: Streamer,
    period: string,
    inputs: Record<string, any>,
    sampleSize: number,
    freshness: string,
    isDemo: boolean
  ): MetricProvenance {
    return {
      source: streamer.source,
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: inputs,
      period,
      formula: def.formula || 'Lectura directa',
      formulaVersion: def.formulaVersion,
      sampleSize,
      capturedAt: streamer.verificationDate || null,
      freshnessStatus: freshness,
      limitations: def.limitations,
      calculatedAt: new Date().toISOString(),
      isDemo,
    };
  }

  private createExpiredResult(
    def: MetricDefinition,
    streamer: Streamer,
    period: string,
    freshness: string
  ): MetricResult {
    return {
      metricId: def.id,
      name: def.name,
      shortLabel: def.shortLabel,
      value: null,
      formattedValue: 'DATOS EXPIRADOS',
      type: def.type,
      status: 'EXPIRED',
      statusReason: 'Los datos de la API de KICK han superado el límite de retención de 24 horas y no pueden publicarse.',
      period,
      sampleSize: 0,
      formulaVersion: def.formulaVersion,
      provenance: {
        source: streamer.source,
        sourceType: 'KICK_API_DATA',
        inputsUsed: {},
        period,
        formula: def.formula || '',
        formulaVersion: def.formulaVersion,
        sampleSize: 0,
        capturedAt: streamer.verificationDate || null,
        freshnessStatus: freshness,
        limitations: ['Datos caducados según política de retención oficial.'],
        calculatedAt: new Date().toISOString(),
        isDemo: false,
      },
      quality: {
        completenessScore: 0,
        freshnessStatus: 'EXPIRED',
        hasValidSource: true,
        isRestricted: true,
        sampleSufficiency: false,
        score: 0,
        label: 'DEFICIENTE',
        description: 'Mide la calidad de los datos, no al streamer.',
      },
      limitations: ['Datos expirados.'],
      calculatedAt: new Date().toISOString(),
    };
  }

  private createErrorResult(
    metricId: string,
    status: 'NO_DISPONIBLE' | 'CALCULATION_ERROR',
    reason: string,
    streamer: Streamer
  ): MetricResult {
    return {
      metricId,
      name: metricId,
      shortLabel: metricId,
      value: null,
      formattedValue: 'NO DISPONIBLE',
      type: 'CALCULADO',
      status,
      statusReason: reason,
      period: 'actual',
      sampleSize: 0,
      formulaVersion: 'unknown',
      provenance: {
        source: streamer?.source || 'DESCONOCIDA',
        sourceType: 'DESCONOCIDA',
        inputsUsed: {},
        period: 'actual',
        formula: 'N/A',
        formulaVersion: 'unknown',
        sampleSize: 0,
        capturedAt: null,
        freshnessStatus: 'UNKNOWN',
        limitations: [reason],
        calculatedAt: new Date().toISOString(),
        isDemo: false,
      },
      quality: {
        completenessScore: 0,
        freshnessStatus: 'UNKNOWN',
        hasValidSource: false,
        isRestricted: false,
        sampleSufficiency: false,
        score: 0,
        label: 'DEFICIENTE',
        description: 'Mide la calidad de los datos, no al streamer.',
      },
      limitations: [reason],
      calculatedAt: new Date().toISOString(),
    };
  }

  private logAudit(entry: AnalyticsAuditRecord): void {
    this.calculationAuditLog.unshift(entry);
    if (this.calculationAuditLog.length > 100) {
      this.calculationAuditLog.pop();
    }
  }

  public getCalculationAuditLog(): AnalyticsAuditRecord[] {
    return [...this.calculationAuditLog];
  }
}

export const analyticsEngine = new AnalyticsEngine();
