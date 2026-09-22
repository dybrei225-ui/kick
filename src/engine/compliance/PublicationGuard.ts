/**
 * KICK ANALYTICS MX — PUBLICATION GUARD (Fase 6, Reqs 35, 36, 37)
 * Guardia de publicación para garantizar que no se redistribuyan datos crudos de KICK
 * de forma no autorizada y que los rankings/reportes respeten la vigencia de los datos.
 */

import { DataClassification } from '../../types';
import { KickDataPolicy } from './KickDataPolicy';

export interface PublicationCheckResult {
  canPublish: boolean;
  classification: DataClassification;
  reason: string;
  badgeLabel?: string;
  warningNotice?: string;
}

export class PublicationGuard {
  private static instance: PublicationGuard;
  private policy: KickDataPolicy;

  private constructor() {
    this.policy = KickDataPolicy.getInstance();
  }

  public static getInstance(): PublicationGuard {
    if (!PublicationGuard.instance) {
      PublicationGuard.instance = new PublicationGuard();
    }
    return PublicationGuard.instance;
  }

  /**
   * Verifica si un valor o métrica puede mostrarse en la interfaz pública
   */
  public canPublishMetric(
    classification: DataClassification,
    isExpired = false
  ): PublicationCheckResult {
    // 1. Datos Demo siempre se pueden publicar localmente
    if (classification === 'DEMO_DATA') {
      return {
        canPublish: true,
        classification: 'DEMO_DATA',
        badgeLabel: 'DEMO',
        reason: 'Datos sintéticos locales para demostración.',
      };
    }

    // 2. Datos manuales verificados
    if (classification === 'MANUAL_DATA') {
      return {
        canPublish: true,
        classification: 'MANUAL_DATA',
        badgeLabel: 'MANUAL',
        reason: 'Dato registrado y verificado por operador.',
      };
    }

    // 3. Indicadores derivados propios (KICK ANALYTICS MX)
    if (classification === 'INTERNAL_DERIVED_DATA') {
      return {
        canPublish: true,
        classification: 'INTERNAL_DERIVED_DATA',
        badgeLabel: 'CALCULADO POR KICK ANALYTICS MX',
        reason: 'Cálculo matemático agregado propio.',
      };
    }

    // 4. Datos directos de KICK API
    if (classification === 'KICK_API_DATA') {
      if (isExpired) {
        return {
          canPublish: false,
          classification: 'KICK_API_DATA',
          reason: 'Dato expirado (superó el TTL de 24 horas de KICK API). Se requiere actualización.',
          warningNotice: 'NO PUBLICAR: DATO EXPIRADO',
        };
      }

      return {
        canPublish: true,
        classification: 'KICK_API_DATA',
        badgeLabel: 'OBSERVADO (KICK API)',
        reason: 'Dato público oficial dentro de la ventana de vigencia (24h).',
      };
    }

    return {
      canPublish: false,
      classification: 'KICK_API_DATA',
      reason: 'Clasificación desconocida. Por principio de precaución: NO PUBLICAR.',
    };
  }

  /**
   * Verifica si una solicitud de exportación es legalmente válida
   * Bloquea exportaciones masivas de raw API data para prevenir redistribución indebida (Req 36)
   */
  public canExportDataset(format: 'json' | 'csv', isRawApiDump: boolean): {
    canExport: boolean;
    reason: string;
    actionRequired?: string;
  } {
    if (isRawApiDump) {
      return {
        canExport: false,
        reason:
          'La redistribución masiva de datos brutos de la API de KICK a terceros está prohibida por los Términos de Desarrollador de KICK.',
        actionRequired: 'REQUIERE AUTORIZACIÓN DE KICK (Commercial Redistribution License)',
      };
    }

    return {
      canExport: true,
      reason: 'Exportación de indicadores analíticos agregados permitida.',
    };
  }
}

export const publicationGuard = PublicationGuard.getInstance();
