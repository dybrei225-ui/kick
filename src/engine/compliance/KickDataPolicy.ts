/**
 * KICK ANALYTICS MX — KICK DATA POLICY & COMPLIANCE GATE (Fase 6, Reqs 2, 3, 4, 5, 6, 42)
 * Política estricta de cumplimiento normativo conforme a los Términos de Desarrollador de KICK.
 * 
 * Principio: COMPLIANCE FIRST
 * "No asumir que porque técnicamente sea posible almacenar un dato, también está permitido hacerlo."
 */

import {
  DataClassification,
  SnapshotRetentionPolicyStatus,
} from '../../types';

export interface DataRetentionRule {
  classification: DataClassification;
  maxTtlSeconds: number; // e.g. 86400 (24 horas) para KICK API
  storageAllowed: boolean;
  persistentAllowed: boolean;
  redistributionAllowed: boolean;
  policyDescription: string;
}

export interface LockedFeature {
  id: string;
  name: string;
  description: string;
  requiredAuthorization: string;
  isLocked: boolean;
  reason: string;
}

export class KickDataPolicy {
  private static instance: KickDataPolicy;

  // TTL oficial obligatorio: 24 horas máximo para caché de API
  public static readonly API_CACHE_MAX_TTL_SECONDS = 86400; // 24 horas

  // Reglas de retención por clasificación
  private readonly retentionRules: Record<DataClassification, DataRetentionRule> = {
    KICK_API_DATA: {
      classification: 'KICK_API_DATA',
      maxTtlSeconds: KickDataPolicy.API_CACHE_MAX_TTL_SECONDS,
      storageAllowed: true,
      persistentAllowed: false, // Solo en caché temporal de máximo 24 horas
      redistributionAllowed: false, // Prohibido redistribuir raw API data
      policyDescription:
        'Caché temporal de 24h. No se permite almacenamiento permanente indefinido de mediciones crudas de la API.',
    },
    INTERNAL_DERIVED_DATA: {
      classification: 'INTERNAL_DERIVED_DATA',
      maxTtlSeconds: 31536000, // 1 año (indicadores calculados propios)
      storageAllowed: true,
      persistentAllowed: true,
      redistributionAllowed: true, // Reportes y análisis derivados etiquetados
      policyDescription:
        'Indicadores agregados y métricas calculadas por el motor analítico de KICK ANALYTICS MX.',
    },
    MANUAL_DATA: {
      classification: 'MANUAL_DATA',
      maxTtlSeconds: 31536000, // 1 año
      storageAllowed: true,
      persistentAllowed: true,
      redistributionAllowed: false,
      policyDescription:
        'Datos verificados introducidos manualmente por el investigador u operador autorizado.',
    },
    DEMO_DATA: {
      classification: 'DEMO_DATA',
      maxTtlSeconds: 0, // Sin restricción normativa (ficticio)
      storageAllowed: true,
      persistentAllowed: true,
      redistributionAllowed: true,
      policyDescription:
        'Datos sintéticos para demostración local sin vinculación con servidores reales de KICK.',
    },
  };

  // Funcionalidades bloqueadas por falta de autorización oficial expresa (Req 3, 42)
  private readonly lockedFeatures: LockedFeature[] = [
    {
      id: 'RAW_API_MASS_EXPORT',
      name: 'Descarga Masiva de Datos Crudos KICK',
      description: 'Exportación directa y completa de la base de datos de canales de KICK sin agregación.',
      requiredAuthorization: 'REQUIERE AUTORIZACIÓN DE KICK (Commercial Data Distribution License)',
      isLocked: true,
      reason: 'Los términos de KICK prohíben redistribuir materiales brutos de la API pública a terceros.',
    },
    {
      id: 'UNLIMITED_API_SNAPSHOT_STORAGE',
      name: 'Almacenamiento Indefinido de Snapshots API',
      description: 'Retención histórica permanente sin caducidad de mediciones directas de la API.',
      requiredAuthorization: 'REQUIERE AUTORIZACIÓN DE KICK (Historical Ingestion Agreement)',
      isLocked: true,
      reason: 'La política de retención limita los datos crudos a caché temporal (TTL 24h).',
    },
    {
      id: 'AUTONOMOUS_BACKGROUND_DAEMON',
      name: 'Sincronización Continua 24/7 en Servidor Central',
      description: 'Sincronización desatendida continua cuando la aplicación del usuario está cerrada.',
      requiredAuthorization: 'REQUIERE INFRAESTRUCTURA DE BACKEND Y WEBHOOKS OFICIALES',
      isLocked: true,
      reason: 'El cliente opera en modo local/navegador a costo $0. La automatización continua requiere backend autorizado.',
    },
    {
      id: 'HEURISTIC_REGIONAL_INFERENCE',
      name: 'Inferencia Automática de País por Contenido o Idioma',
      description: 'Asignar automáticamente nacionalidad mexicana por acento, juego o títulos de directo.',
      requiredAuthorization: 'BLOQUEADO POR DIRECTRIZ DE INTEGRIDAD (Cero Inferencia Falsa)',
      isLocked: true,
      reason: 'KICK ANALYTICS MX prohíbe clasificar a streamers como mexicanos sin fuente fehaciente.',
    },
  ];

  public static getInstance(): KickDataPolicy {
    if (!KickDataPolicy.instance) {
      KickDataPolicy.instance = new KickDataPolicy();
    }
    return KickDataPolicy.instance;
  }

  /**
   * Determina la política aplicable para un snapshot según su origen
   */
  public evaluateSnapshotPolicy(source: string, isDemo: boolean): SnapshotRetentionPolicyStatus {
    if (isDemo) return 'DEMO';
    if (source.includes('Manual') || source.includes('Auditoría')) return 'MANUAL';
    if (source.includes('KICK Public API') || source.includes('api.kick.com')) {
      return 'TEMPORARY_CACHE';
    }
    return 'NOT_ALLOWED';
  }

  /**
   * Retorna las reglas de retención para una clasificación
   */
  public getRetentionRule(classification: DataClassification): DataRetentionRule {
    return this.retentionRules[classification];
  }

  /**
   * Verifica si una funcionalidad está permitida o bloqueada por compliance
   */
  public isFeatureLocked(featureId: string): boolean {
    const feat = this.lockedFeatures.find((f) => f.id === featureId);
    return feat ? feat.isLocked : false;
  }

  /**
   * Obtiene la lista completa de características bloqueadas por compliance
   */
  public getLockedFeatures(): LockedFeature[] {
    return [...this.lockedFeatures];
  }

  /**
   * Valida si un dato proveniente de la API puede ser almacenado
   */
  public validateApiStorageAllowed(): { allowed: boolean; message: string; ttlSeconds: number } {
    return {
      allowed: true,
      message: 'Almacenamiento permitido bajo política de caché temporal con TTL de 24h.',
      ttlSeconds: KickDataPolicy.API_CACHE_MAX_TTL_SECONDS,
    };
  }
}

export const kickDataPolicy = KickDataPolicy.getInstance();
