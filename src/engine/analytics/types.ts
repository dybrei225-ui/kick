/**
 * KICK ANALYTICS MX — Analytics Engine Types & Contracts
 * Principios: Determinismo, Explicabilidad, Auditoría, Cero Inferencia, Cero Inventos.
 */

import { Streamer, ChannelSnapshot, SourceType, ApiDataFreshnessStatus } from '../../types';

export type MetricType = 'OBSERVADO' | 'CALCULADO';

export type MetricCalculationStatus =
  | 'AVAILABLE'
  | 'NO_DISPONIBLE'
  | 'INSUFFICIENT_DATA'
  | 'STALE'
  | 'EXPIRED'
  | 'RESTRICTED'
  | 'CALCULATION_ERROR';

export type AnalyticalPeriod =
  | '7d'
  | '30d'
  | '90d'
  | '6m'
  | '1a'
  | 'historico';

export type PublicationPolicy = 'PUBLICABLE' | 'RESTRICTED' | 'CONDITIONAL';

export type AnomalyDetectionMethod = 'MAD' | 'IQR' | 'Z_SCORE';

export interface MetricDefinition {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  type: MetricType;
  formula?: string;
  formulaVersion: string;
  inputMetrics: string[];
  requiredFields: string[];
  minimumSampleSize: number;
  timeWindow?: AnalyticalPeriod;
  freshnessRequirementHours?: number;
  limitations: string[];
  version: string;
  unit: string;
  sourceRequirements: SourceType[];
  publicationPolicy: PublicationPolicy;
}

export interface MetricProvenance {
  source: string;
  sourceType: string;
  inputsUsed: Record<string, string | number | null | undefined>;
  period: string;
  formula: string;
  formulaVersion: string;
  sampleSize: number;
  capturedAt: string | null;
  freshnessStatus: ApiDataFreshnessStatus | string;
  limitations: string[];
  calculatedAt: string;
  isDemo: boolean;
}

export interface MetricQuality {
  completenessScore: number; // 0 a 100
  freshnessStatus: ApiDataFreshnessStatus | string;
  hasValidSource: boolean;
  isRestricted: boolean;
  sampleSufficiency: boolean;
  score: number; // 0 a 100
  label: 'ALTA' | 'MEDIA' | 'BAJA' | 'DEFICIENTE';
  description: string; // "Este indicador mide la calidad de los datos disponibles, no la calidad del streamer."
}

export interface MetricResult {
  metricId: string;
  name: string;
  shortLabel: string;
  value: number | string | null;
  formattedValue: string;
  type: MetricType;
  status: MetricCalculationStatus;
  statusReason?: string;
  period: string;
  sampleSize: number;
  formulaVersion: string;
  provenance: MetricProvenance;
  quality: MetricQuality;
  limitations: string[];
  calculatedAt: string;
}

export interface StatisticalAnomaly {
  id: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string;
  metricId: string;
  metricName: string;
  observedDate: string;
  observedValue: number;
  expectedValue: number;
  expectedRange: { min: number; max: number };
  deviationMagnitude: string;
  method: AnomalyDetectionMethod;
  sampleSize: number;
  status: 'ANOMALIA_DETECTADA';
  neutralDisclaimer: string; // "El valor observado se encuentra fuera del rango habitual de la muestra analizada. No se determina la causa ni se infiere conducta indebida."
  detectedAt: string;
  isDemo: boolean;
}

export interface GrowthAnalysisResult {
  metricId: string;
  period: AnalyticalPeriod;
  initialValue: number | null;
  finalValue: number | null;
  initialDate: string | null;
  finalDate: string | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  formattedPercentage: string;
  trend: 'CRECIMIENTO' | 'ESTABLE' | 'DESCENSO' | 'NO_DISPONIBLE';
  sampleSize: number;
  status: MetricCalculationStatus;
  statusReason?: string;
  formulaVersion: string;
  provenance: MetricProvenance;
  limitations: string[];
}

export interface TrendAnalysisResult {
  metricId: string;
  period: AnalyticalPeriod;
  direction: 'CRECIMIENTO' | 'ESTABLE' | 'DESCENSO' | 'DATOS_INSUFICIENTES';
  slope: number | null;
  formattedSlope: string;
  movingAverageLatest: number | null;
  observationsCount: number;
  status: MetricCalculationStatus;
  statusReason?: string;
  provenance: MetricProvenance;
}

export interface ActivityAnalysisResult {
  streamCount: MetricResult;
  streamingFrequency: MetricResult;
  durationAverageHours: MetricResult;
  durationMedianHours: MetricResult;
  activeDaysCount: MetricResult;
  observedConsistency: MetricResult; // INDICADOR DE REGULARIDAD OBSERVADA
}

export interface ConsistencyAnalysisResult {
  regularityScore: number | null; // 0 - 100
  stabilityLabel: 'ALTA REGULARIDAD' | 'REGULARIDAD MEDIA' | 'ALTA DISPERSIÓN' | 'NO DISPONIBLE';
  coefficientOfVariation: number | null;
  observationsCount: number;
  neutralDescription: string; // "Medición de regularidad de directos observada en el histórico. No constituye valoración de calidad del creador."
  status: MetricCalculationStatus;
  provenance: MetricProvenance;
}

export interface CategoryAnalysisResult {
  categoryName: string;
  knownChannelsCount: number; // MUESTRA DISPONIBLE / COBERTURA CONOCIDA
  streamsObservedCount: number;
  aggregateAudience: number | null;
  averageAudience: number | null;
  medianAudience: number | null;
  peakAudienceObserved: number | null;
  topChannelsInSample: { username: string; followers: number | null; avgViewers: number | null }[];
  sampleCoverageLabel: string; // "COBERTURA CONOCIDA EN LA MUESTRA"
  limitations: string[];
  provenance: MetricProvenance;
}

export interface MultiStreamerComparisonItem {
  streamer: Streamer;
  metrics: Record<string, MetricResult>;
  sampleSize: number;
  dataQualityScore: number;
  source: string;
  coverageLabel: string;
}

export interface AnalyticsAuditRecord {
  id: string;
  timestamp: string;
  metricId: string;
  streamerId?: string;
  period: string;
  formulaVersion: string;
  sampleSize: number;
  sourceType: string;
  status: MetricCalculationStatus;
}
