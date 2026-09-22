/**
 * KICK ANALYTICS MX — ALERT RULE REGISTRY (Fase 8)
 * Registro centralizado de reglas de alerta deterministas.
 * 
 * Regla: Sin IA generativa ni conjeturas. Cada regla tiene id unívoco,
 * fórmula explícita, versión y soporte de histeresis para evitar oscilaciones.
 */

import { AlertRule } from './types';
import { appStorage } from '../../adapters/storage/StorageAdapter';

const RULES_STORAGE_KEY = 'kick_analytics_mx_alert_rules_v1';

export class AlertRuleRegistry {
  private static instance: AlertRuleRegistry;
  private rules: Map<string, AlertRule> = new Map();

  private constructor() {
    this.registerDefaultRules();
  }

  public static getInstance(): AlertRuleRegistry {
    if (!AlertRuleRegistry.instance) {
      AlertRuleRegistry.instance = new AlertRuleRegistry();
    }
    return AlertRuleRegistry.instance;
  }

  private registerDefaultRules(): void {
    const defaults: AlertRule[] = [
      {
        id: 'rule_follower_growth',
        name: 'Crecimiento Significativo de Seguidores',
        description: 'Se detecta un incremento porcentual en el conteo de seguidores superior o igual al umbral.',
        metricId: 'follower_growth_percentage',
        condition: 'PERCENT_CHANGE',
        threshold: 10,
        triggerThreshold: 10,
        clearThreshold: 7,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: '((Seguidores_Actuales - Seguidores_Base) / Seguidores_Base) * 100 >= 10%',
      },
      {
        id: 'rule_follower_drop',
        name: 'Descenso Relevante de Seguidores',
        description: 'Se detecta una reducción porcentual en el conteo de seguidores superior o igual al umbral.',
        metricId: 'follower_growth_percentage',
        condition: 'PERCENT_CHANGE',
        threshold: -10,
        triggerThreshold: -10,
        clearThreshold: -7,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: '((Seguidores_Actuales - Seguidores_Base) / Seguidores_Base) * 100 <= -10%',
      },
      {
        id: 'rule_viewer_growth',
        name: 'Incremento Relevante de Concurrencia',
        description: 'La media o concurrencia de espectadores supera la referencia previa en el umbral establecido.',
        metricId: 'average_viewers',
        condition: 'PERCENT_CHANGE',
        threshold: 15,
        triggerThreshold: 15,
        clearThreshold: 10,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: '((Viewers_Actual - Viewers_Base) / Viewers_Base) * 100 >= 15%',
      },
      {
        id: 'rule_viewer_drop',
        name: 'Descenso Relevante de Concurrencia',
        description: 'La concurrencia media se sitúa por debajo de la referencia en el umbral establecido.',
        metricId: 'average_viewers',
        condition: 'PERCENT_CHANGE',
        threshold: -15,
        triggerThreshold: -15,
        clearThreshold: -10,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: '((Viewers_Actual - Viewers_Base) / Viewers_Base) * 100 <= -15%',
      },
      {
        id: 'rule_activity_drop',
        name: 'Reducción de Actividad de Emisiones',
        description: 'Disminución en el volumen o frecuencia de emisiones durante el periodo respecto a la referencia.',
        metricId: 'stream_count',
        condition: 'ACTIVITY_DROP',
        threshold: -25,
        triggerThreshold: -25,
        clearThreshold: -15,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: '((Streams_Actuales - Streams_Previos) / Streams_Previos) * 100 <= -25%',
      },
      {
        id: 'rule_activity_recovery',
        name: 'Recuperación de Actividad Detectada',
        description: 'El canal vuelve a emitir tras un intervalo previo de baja o nula actividad.',
        metricId: 'stream_count',
        condition: 'ACTIVITY_RECOVERY',
        threshold: 25,
        triggerThreshold: 25,
        clearThreshold: 15,
        minimumSampleSize: 2,
        comparisonPeriod: '30d',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Retorno de emisiones activas tras cadencia nula o muy baja previa.',
      },
      {
        id: 'rule_new_peak',
        name: 'Nuevo Máximo en la Muestra Analizada',
        description: 'El pico de concurrencia actual supera el máximo previamente registrado en la muestra disponible.',
        metricId: 'peak_viewers',
        condition: 'NEW_HIGH',
        minimumSampleSize: 3,
        comparisonPeriod: 'muestra_disponible',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Peak_Actual > Max(Peak_Historico_Muestra)',
      },
      {
        id: 'rule_new_low',
        name: 'Nuevo Mínimo en la Muestra Analizada',
        description: 'La métrica observada se sitúa por debajo del menor registro registrado en la muestra disponible.',
        metricId: 'average_viewers',
        condition: 'NEW_LOW',
        minimumSampleSize: 3,
        comparisonPeriod: 'muestra_disponible',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Avg_Actual < Min(Avg_Historico_Muestra) && Min > 0',
      },
      {
        id: 'rule_trend_change',
        name: 'Cambio en la Dirección de Tendencia',
        description: 'La pendiente de regresión lineal ha invertido su dirección (p. ej. de CRECIMIENTO a DESCENSO).',
        metricId: 'viewers_trend',
        condition: 'TREND_CHANGE',
        minimumSampleSize: 3,
        comparisonPeriod: '30d',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Signo(Pendiente_Lineal_Actual) != Signo(Pendiente_Lineal_Previa)',
      },
      {
        id: 'rule_category_change',
        name: 'Cambio de Categoría Observado',
        description: 'La categoría principal observada difiere de la categoría previamente registrada.',
        metricId: 'primary_category',
        condition: 'CATEGORY_CHANGE',
        minimumSampleSize: 2,
        comparisonPeriod: 'reciente',
        severity: 'INFO',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Categoria_Actual != Categoria_Anterior && Ambas != null',
      },
      {
        id: 'rule_anomaly',
        name: 'Anomalía Estadística (Outlier MAD)',
        description: 'Desviación estadística inusual respecto al histórico del canal (MAD v1). Sin juicio de causa.',
        metricId: 'anomaly_score',
        condition: 'ANOMALY',
        threshold: 3.0,
        minimumSampleSize: 4,
        comparisonPeriod: 'historico',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: '|X - Mediana| > 3.0 * MAD',
      },
      {
        id: 'rule_data_stale',
        name: 'Datos Desactualizados (Stale Data)',
        description: 'La antigüedad del registro supera el tiempo máximo de frescura permitido para la fuente.',
        metricId: 'data_freshness',
        condition: 'DATA_STALE',
        severity: 'WARNING',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Antiguedad_Horas > Max_TTL_Fuente',
      },
      {
        id: 'rule_data_expired',
        name: 'Datos de API Expirados (> 24 Horas)',
        description: 'Medición de la API de KICK que ha superado el límite legal de 24h sin refresco. Bloqueada.',
        metricId: 'api_freshness',
        condition: 'DATA_EXPIRED',
        severity: 'CRITICAL',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Horas_Desde_Captura_API > 24.0 (Schedule 1 KICK Dev Agreement)',
      },
      {
        id: 'rule_data_quality',
        name: 'Problema en la Calidad de los Datos',
        description: 'Incompletitud en campos obligatorios, timestamps ausentes o conflicto de proveniencia.',
        metricId: 'data_quality',
        condition: 'DATA_QUALITY',
        threshold: 60,
        severity: 'CRITICAL',
        enabled: true,
        version: '1.0',
        formulaDescription: 'Score_Calidad_Datos < 60/100',
      },
    ];

    for (const r of defaults) {
      this.rules.set(r.id, r);
    }
  }

  public getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  public updateRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.saveToStorage();
  }

  public setRuleEnabled(id: string, enabled: boolean): void {
    const r = this.rules.get(id);
    if (r) {
      r.enabled = enabled;
      this.saveToStorage();
    }
  }

  public updateRuleThreshold(id: string, threshold: number): void {
    const r = this.rules.get(id);
    if (r) {
      r.threshold = threshold;
      if (r.triggerThreshold !== undefined) {
        r.triggerThreshold = threshold;
        r.clearThreshold = threshold > 0 ? threshold * 0.7 : threshold * 0.7;
      }
      this.saveToStorage();
    }
  }

  public resetToDefaults(): void {
    this.rules.clear();
    this.registerDefaultRules();
    this.saveToStorage();
  }

  public async loadFromStorage(): Promise<void> {
    try {
      const raw = await appStorage.getItem(RULES_STORAGE_KEY);
      if (raw) {
        const storedRules: AlertRule[] = JSON.parse(raw);
        for (const r of storedRules) {
          this.rules.set(r.id, r);
        }
      }
    } catch (err) {
      console.warn('[AlertRuleRegistry] Error cargando reglas desde storage:', err);
    }
  }

  public async saveToStorage(): Promise<void> {
    try {
      const list = this.getAllRules();
      await appStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[AlertRuleRegistry] Error guardando reglas en storage:', err);
    }
  }
}

export const alertRuleRegistry = AlertRuleRegistry.getInstance();
