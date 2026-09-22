/**
 * KICK ANALYTICS MX — KICK API CAPABILITIES MATRIX (Fase 5, Req 5)
 * Matriz estricta de capacidades y métricas oficiales disponibles vs no disponibles
 * basada exclusivamente en la documentación oficial de KICK (docs.kick.com).
 * 
 * Regla: NO asumir que porque una métrica aparece en la web de KICK está disponible en la API.
 * Toda métrica ausente debe mantenerse como 'NO DISPONIBLE'.
 */

export interface MetricCapabilityInfo {
  key: string;
  name: string;
  status: 'available' | 'unavailable' | 'conditional_only' | 'calculated_locally';
  officialSourceEndpoint?: string;
  description: string;
  transparencyNotice: string;
}

export class KickApiCapabilities {
  public static readonly CAPABILITIES: Record<string, MetricCapabilityInfo> = {
    users: {
      key: 'users',
      name: 'Datos Básicos de Usuario',
      status: 'available',
      officialSourceEndpoint: 'GET /public/v1/users',
      description: 'Identificador único, nombre de usuario, nombre visible, avatar y biografía pública.',
      transparencyNotice: 'Disponible directamente a través de KICK Public API.',
    },
    channels: {
      key: 'channels',
      name: 'Información del Canal',
      status: 'available',
      officialSourceEndpoint: 'GET /public/v1/channels',
      description: 'Slug del canal, banner, categoría actual, suscriptores activos y estado de verificación.',
      transparencyNotice: 'Disponible directamente a través de KICK Public API.',
    },
    categories: {
      key: 'categories',
      name: 'Catálogo de Categorías',
      status: 'available',
      officialSourceEndpoint: 'GET /public/v1/categories',
      description: 'Identificador numérico, nombre, slug de categoría e icono oficial.',
      transparencyNotice: 'Disponible directamente a través de KICK Public API.',
    },
    livestreams: {
      key: 'livestreams',
      name: 'Transmisiones en Vivo Activas',
      status: 'available',
      officialSourceEndpoint: 'GET /public/v1/livestreams',
      description: 'Estado en vivo, título de transmisión, viewers concurrentes en vivo e inicio de stream.',
      transparencyNotice: 'Disponible cuando el streamer se encuentra transmitiendo en vivo.',
    },
    livestreamStats: {
      key: 'livestreamStats',
      name: 'Estadísticas de Livestream en Directo',
      status: 'available',
      officialSourceEndpoint: 'GET /public/v1/livestreams/stats',
      description: 'Métricas de la sesión activa provistas oficialmente por la API.',
      transparencyNotice: 'Disponible únicamente durante o inmediatamente tras una transmisión oficial.',
    },
    followersHistorical: {
      key: 'followersHistorical',
      name: 'Serie Histórica de Seguidores',
      status: 'unavailable',
      description: 'KICK API no expone series cronológicas pasadas de seguidores previos a la ingesta.',
      transparencyNotice:
        'NO DISPONIBLE en la API oficial. KICK ANALYTICS MX solo registra el histórico propio desde la fecha de primera captura.',
    },
    historicalViewerSeries: {
      key: 'historicalViewerSeries',
      name: 'Serie Temporal de Viewers Históricos',
      status: 'unavailable',
      description: 'No existe endpoint oficial para consultar minutos o días pasados retroactivos de audiencia.',
      transparencyNotice:
        'NO DISPONIBLE en la API oficial. KICK ANALYTICS MX construye series históricas únicamente con sus propios snapshots.',
    },
    estimatedAverageViewers: {
      key: 'estimatedAverageViewers',
      name: 'Promedio de Viewers Acumulado',
      status: 'calculated_locally',
      description: 'La API solo entrega espectadores instantáneos en vivo.',
      transparencyNotice:
        'DATO CALCULADO. Calculado matemáticamente a partir de snapshots observados acumulados por KICK ANALYTICS MX, nunca entregado por KICK.',
    },
    hoursStreamedTotal: {
      key: 'hoursStreamedTotal',
      name: 'Total de Horas Transmitidas',
      status: 'calculated_locally',
      description: 'La API oficial no proporciona un contador total de horas de por vida.',
      transparencyNotice:
        'DATO CALCULADO a partir de la duración de streams observados por el sistema, no medición directa de KICK.',
    },
    countryOfOrigin: {
      key: 'countryOfOrigin',
      name: 'País de Residencia / Nacionalidad',
      status: 'unavailable',
      description: 'KICK no almacena ni expone públicamente la nacionalidad o país de residencia del streamer.',
      transparencyNotice:
        'NO DISPONIBLE vía API. KICK ANALYTICS MX solo asigna "México" si existe verificación documental directa, de lo contrario indica "PAÍS: NO DISPONIBLE".',
    },
  };

  public static isAvailable(metricKey: string): boolean {
    const cap = this.CAPABILITIES[metricKey];
    return cap ? cap.status === 'available' : false;
  }

  public static getCapability(metricKey: string): MetricCapabilityInfo | undefined {
    return this.CAPABILITIES[metricKey];
  }

  public static getAllCapabilities(): MetricCapabilityInfo[] {
    return Object.values(this.CAPABILITIES);
  }

  public static getOfficialEndpoints(): string[] {
    return [
      'POST https://id.kick.com/oauth/token (OAuth 2.1 Client Credentials / Auth Code)',
      'GET https://api.kick.com/public/v1/channels (Información y slug de canales)',
      'GET https://api.kick.com/public/v1/users (Perfiles públicos de usuario)',
      'GET https://api.kick.com/public/v1/categories (Directorio oficial de categorías)',
      'GET https://api.kick.com/public/v1/livestreams (Transmisiones activas y viewers en vivo)',
      'GET https://api.kick.com/public/v1/livestreams/stats (Métricas de sesión en vivo)',
    ];
  }
}
