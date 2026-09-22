/**
 * KICK ANALYTICS MX — REQUEST BUDGET MANAGER (Fase 6, Reqs 17, 18, 19)
 * Calcula y proyecta el presupuesto de peticiones antes de lanzar sincronizaciones,
 * protegiendo contra bloqueos de HTTP 429 (Rate Limit).
 */

import { RequestBudget, SyncPriority } from '../../types';
import { KickApiConfig } from '../../adapters/kick/KickApiConfig';

export class RequestBudgetManager {
  private static instance: RequestBudgetManager;
  private config: KickApiConfig;

  // Límite de seguridad por ráfaga en cliente web (default: 60 peticiones por minuto)
  public static readonly DEFAULT_SAFE_MINUTE_BUDGET = 60;

  private constructor() {
    this.config = KickApiConfig.getInstance();
  }

  public static getInstance(): RequestBudgetManager {
    if (!RequestBudgetManager.instance) {
      RequestBudgetManager.instance = new RequestBudgetManager();
    }
    return RequestBudgetManager.instance;
  }

  /**
   * Calcula el presupuesto antes de ejecutar una sincronización masiva o en lote
   * @param channelsCount Número de canales a consultar
   * @param includeLivestream Si requiere llamada adicional a /livestreams
   * @param priority Prioridad de la sincronización
   */
  public calculateBudget(
    channelsCount: number,
    includeLivestream = true,
    priority: SyncPriority = 'NORMAL'
  ): RequestBudget {
    const rateLimitPerMinute = RequestBudgetManager.DEFAULT_SAFE_MINUTE_BUDGET;

    // Por canal se estiman 1 llamada a /channels/{slug} y si aplica 1 a /livestreams
    const callsPerChannel = includeLivestream ? 2 : 1;
    const estimatedRequests = channelsCount * callsPerChannel;

    // Margen de seguridad: 80% del límite por minuto para evitar 429
    const safeThreshold = Math.floor(rateLimitPerMinute * 0.85);

    // Si la prioridad es HIGH, permitimos agotar hasta el 95% del presupuesto
    const allowedLimit = priority === 'HIGH' ? Math.floor(rateLimitPerMinute * 0.95) : safeThreshold;

    const isSafe = estimatedRequests <= allowedLimit;
    const status: 'SEGURO' | 'LIMITADO' = isSafe ? 'SEGURO' : 'LIMITADO';

    let warningMessage: string | undefined;
    if (!isSafe) {
      warningMessage = `El lote de ${channelsCount} canales generará aprox. ${estimatedRequests} peticiones, superando el margen seguro de ${allowedLimit} req/min. SINCRONIZACIÓN POSPUESTA o particione en lotes más pequeños.`;
    }

    // Tamaño de lote recomendado
    const recommendedBatchSize = Math.max(1, Math.floor(allowedLimit / callsPerChannel));

    return {
      pendingChannelsCount: channelsCount,
      estimatedRequests,
      availableRequests: allowedLimit,
      rateLimitRemaining: Math.max(0, allowedLimit - estimatedRequests),
      isSafe,
      status,
      recommendedBatchSize,
      warningMessage,
    };
  }
}

export const requestBudgetManager = RequestBudgetManager.getInstance();
