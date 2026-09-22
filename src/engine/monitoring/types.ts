/**
 * KICK ANALYTICS MX — MONITORING & ALERT CENTER TYPES (Fase 8)
 * Definiciones estandarizadas para el Centro de Monitoreo, Alertas y Detección de Cambios.
 */

import { ApiDataFreshnessStatus, DataClassification } from '../../types';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'SUPPRESSED';

export type AlertConditionType =
  | 'ABSOLUTE_CHANGE'
  | 'PERCENT_CHANGE'
  | 'THRESHOLD'
  | 'NEW_HIGH'
  | 'NEW_LOW'
  | 'TREND_CHANGE'
  | 'ACTIVITY_DROP'
  | 'ACTIVITY_RECOVERY'
  | 'CATEGORY_CHANGE'
  | 'ANOMALY'
  | 'DATA_STALE'
  | 'DATA_EXPIRED'
  | 'DATA_QUALITY';

export type EventCategory =
  | 'STREAMER_EVENT'
  | 'DATA_EVENT'
  | 'SYSTEM_EVENT'
  | 'COMPLIANCE_EVENT';

export type BaselineType =
  | 'previous_observation'
  | 'previous_period'
  | 'rolling_average'
  | 'rolling_median'
  | 'historical_baseline';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricId: string;
  condition: AlertConditionType;
  threshold?: number;
  triggerThreshold?: number; // Para histeresis
  clearThreshold?: number;   // Para histeresis
  minimumSampleSize?: number;
  comparisonPeriod?: string;
  severity: AlertSeverity;
  enabled: boolean;
  version: string;
  formulaDescription: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string;
  metricId: string;
  metricName: string;
  timestamp: string;
  severity: AlertSeverity;
  status: AlertStatus;
  observedValue: number | string | null;
  referenceValue: number | string | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  period: string;
  sampleSize: number;
  source: string;
  dataType: 'OBSERVED' | 'CALCULATED';
  formulaVersion: string;
  freshness: ApiDataFreshnessStatus;
  explanation: string;
  limitations: string;
  isDemo: boolean;
  silencedUntil?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  dedupKey?: string;
  eventCategory: EventCategory;
}

export interface ChangeEvent {
  id: string;
  timestamp: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string;
  metricId: string;
  fieldLabel: string;
  previousValue: number | string | null;
  newValue: number | string | null;
  changeText: string;
  percentageChange: number | null;
  period: string;
  sampleSize: number;
  source: string;
  dataType: 'OBSERVED' | 'CALCULATED';
  eventCategory: EventCategory;
  isDemo: boolean;
  notes?: string;
}

export interface MonitoringSession {
  sessionId: string;
  startedAt: string;
  finishedAt: string;
  mode: 'MANUAL' | 'ON_OPEN' | 'SCHEDULED_DEMAND';
  channelsRequested: number;
  channelsEvaluated: number;
  metricsEvaluated: number;
  alertsCreated: number;
  alertsSuppressed: number;
  errors: string[];
  budgetUsed: number;
  success: boolean;
}

export interface AlertPreferences {
  followerGrowthThresholdPct: number;
  followerDropThresholdPct: number;
  viewerGrowthThresholdPct: number;
  viewerDropThresholdPct: number;
  activityDropThresholdPct: number;
  minSampleSize: number;
  defaultSilenceHours: number;
  evaluateOnAppOpen: boolean;
  notifyBrowserLocally: boolean;
  suppressionWindowMinutes: number;
}

export interface MonitoringBaseline {
  type: BaselineType;
  metricId: string;
  referenceValue: number | string | null;
  period: string;
  sampleSize: number;
  timestamp: string;
  source: string;
}

export interface SystemMonitoringStatus {
  apiStatus: 'CONNECTED' | 'DISCONNECTED' | 'LIMITED';
  dataStatus: ApiDataFreshnessStatus;
  budgetStatus: 'OK' | 'LIMITADO';
  complianceStatus: 'CONFORME' | 'BLOQUEADO';
  lastEvaluation: string | null;
  totalMonitoredChannels: number;
  activeAlertsCount: number;
  newAlertsCount: number;
  criticalAlertsCount: number;
}
