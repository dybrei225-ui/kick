/**
 * KICK ANALYTICS MX — ALERT DEDUPLICATION & HYSTERESIS ENGINE (Fase 8)
 * Evita duplicación de alertas y elimina oscilaciones en valores límite (flapping).
 * 
 * Regla: Una misma condición no genera cientos de alertas idénticas.
 * Identidad lógica: streamer + metric + rule + period + condition.
 */

import { AlertEvent, AlertRule } from './types';

export class AlertDeduplicationEngine {
  private static instance: AlertDeduplicationEngine;

  private constructor() {}

  public static getInstance(): AlertDeduplicationEngine {
    if (!AlertDeduplicationEngine.instance) {
      AlertDeduplicationEngine.instance = new AlertDeduplicationEngine();
    }
    return AlertDeduplicationEngine.instance;
  }

  /**
   * Genera la clave unívoca de deduplicación lógica
   */
  public generateDedupKey(
    streamerId: string,
    metricId: string,
    ruleId: string,
    period: string,
    condition: string
  ): string {
    return `${streamerId}::${metricId}::${ruleId}::${period}::${condition}`;
  }

  /**
   * Comprueba si la variación supera el umbral respetando la histeresis
   * Para evitar que 20.1% -> 19.9% -> 20.1% active y desactive en bucle.
   * 
   * @param currentVal Valor porcentual actual
   * @param rule Regla evaluada
   * @param isCurrentlyActive Si ya existe una alerta activa para esta regla
   */
  public evaluateHysteresis(
    currentVal: number,
    rule: AlertRule,
    isCurrentlyActive: boolean
  ): { shouldTrigger: boolean; shouldClear: boolean } {
    const trigger = rule.triggerThreshold ?? rule.threshold ?? 0;
    const clear = rule.clearThreshold ?? (trigger > 0 ? trigger * 0.7 : trigger * 0.7);

    if (trigger >= 0) {
      // Regla de incremento positivo (p. ej. crecimiento >= 20%)
      if (isCurrentlyActive) {
        // Ya está activa: solo se desactiva si baja por debajo de clearThreshold (p. ej. < 15%)
        return {
          shouldTrigger: currentVal >= clear,
          shouldClear: currentVal < clear,
        };
      } else {
        // No está activa: requiere alcanzar o superar triggerThreshold (p. ej. >= 20%)
        return {
          shouldTrigger: currentVal >= trigger,
          shouldClear: currentVal < trigger,
        };
      }
    } else {
      // Regla de reducción negativa (p. ej. caída <= -10%, trigger: -10, clear: -7)
      if (isCurrentlyActive) {
        return {
          shouldTrigger: currentVal <= clear,
          shouldClear: currentVal > clear,
        };
      } else {
        return {
          shouldTrigger: currentVal <= trigger,
          shouldClear: currentVal > trigger,
        };
      }
    }
  }

  /**
   * Deduplica una lista de nuevas alertas candidatas contra el histórico existente
   */
  public deduplicate(
    newAlerts: AlertEvent[],
    existingAlerts: AlertEvent[]
  ): {
    toInsert: AlertEvent[];
    toUpdate: AlertEvent[];
    suppressedCount: number;
  } {
    const toInsert: AlertEvent[] = [];
    const toUpdate: AlertEvent[] = [];
    let suppressedCount = 0;

    const existingMap = new Map<string, AlertEvent>();
    for (const ex of existingAlerts) {
      const key = ex.dedupKey || this.generateDedupKey(
        ex.streamerId,
        ex.metricId,
        ex.ruleId,
        ex.period,
        ex.severity
      );
      existingMap.set(key, ex);
    }

    for (const alert of newAlerts) {
      const key = alert.dedupKey || this.generateDedupKey(
        alert.streamerId,
        alert.metricId,
        alert.ruleId,
        alert.period,
        alert.severity
      );

      const existing = existingMap.get(key);

      if (existing) {
        // Si ya está activa (NEW, ACKNOWLEDGED o SUPPRESSED), actualizamos datos sin clonar
        if (existing.status === 'NEW' || existing.status === 'ACKNOWLEDGED' || existing.status === 'SUPPRESSED') {
          // Comprobar si está silenciada
          const isSilenced = existing.silencedUntil && new Date(existing.silencedUntil) > new Date();
          
          existing.timestamp = alert.timestamp;
          existing.observedValue = alert.observedValue;
          existing.referenceValue = alert.referenceValue;
          existing.absoluteChange = alert.absoluteChange;
          existing.percentageChange = alert.percentageChange;
          existing.sampleSize = alert.sampleSize;
          existing.freshness = alert.freshness;
          if (isSilenced) {
            existing.status = 'SUPPRESSED';
            suppressedCount++;
          }
          toUpdate.push(existing);
        } else if (existing.status === 'RESOLVED' || existing.status === 'DISMISSED') {
          // Si estaba resuelta y volvió a ocurrir, emitimos nueva alerta
          toInsert.push(alert);
        }
      } else {
        toInsert.push(alert);
      }
    }

    return { toInsert, toUpdate, suppressedCount };
  }
}

export const alertDeduplicationEngine = AlertDeduplicationEngine.getInstance();
