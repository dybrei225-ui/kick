/**
 * KICK ANALYTICS MX — ALERT RATE LIMITER & SUPPRESSION MANAGER (Fase 8)
 * Previene tormentas de alertas y gestiona silenciamiento de eventos.
 * 
 * Regla: Limita alertas repetitivas por canal / métrica / periodo.
 * Soporta silenciamiento temporal (1h, 24h, 7d, indefinido).
 */

import { AlertEvent } from './types';

export class AlertRateLimiter {
  private static instance: AlertRateLimiter;
  // Historial en memoria de marcas de tiempo por canal y regla: `${streamerId}_${ruleId}` -> timestamps[]
  private emissionTimestamps: Map<string, number[]> = new Map();
  private maxAlertsPerHour = 3;

  private constructor() {}

  public static getInstance(): AlertRateLimiter {
    if (!AlertRateLimiter.instance) {
      AlertRateLimiter.instance = new AlertRateLimiter();
    }
    return AlertRateLimiter.instance;
  }

  /**
   * Comprueba si la emisión de una alerta excede el límite de frecuencia
   */
  public isRateLimited(streamerId: string, ruleId: string): boolean {
    const key = `${streamerId}::${ruleId}`;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const list = this.emissionTimestamps.get(key) || [];
    const recent = list.filter((t) => t > oneHourAgo);
    this.emissionTimestamps.set(key, recent);

    return recent.length >= this.maxAlertsPerHour;
  }

  /**
   * Registra una emisión permitida
   */
  public recordEmission(streamerId: string, ruleId: string): void {
    const key = `${streamerId}::${ruleId}`;
    const list = this.emissionTimestamps.get(key) || [];
    list.push(Date.now());
    this.emissionTimestamps.set(key, list);
  }

  /**
   * Calcula la fecha de expiración del silenciamiento
   */
  public calculateSilenceExpiry(durationHours: number): string | null {
    if (durationHours <= 0) return null; // Indefinido / manual
    const ms = durationHours * 60 * 60 * 1000;
    return new Date(Date.now() + ms).toISOString();
  }

  /**
   * Determina si una alerta está silenciada actualmente
   */
  public isSilenced(alert: AlertEvent): boolean {
    if (!alert.silencedUntil) return false;
    return new Date(alert.silencedUntil) > new Date();
  }
}

export const alertRateLimiter = AlertRateLimiter.getInstance();
