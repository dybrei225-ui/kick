/**
 * KICK ANALYTICS MX — KICK API ERROR DEFINITIONS (Fase 5, Req 12)
 * Errores fuertemente tipados y normalizados para evitar que la UI
 * muestre mensajes técnicos incomprensibles al usuario.
 */

export abstract class KickBaseError extends Error {
  public abstract readonly code: string;
  public abstract readonly userTitle: string;
  public abstract readonly userMessage: string;
  public readonly timestamp: string;
  public readonly endpoint?: string;
  public readonly status?: number;

  constructor(message: string, options?: { endpoint?: string; status?: number }) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.endpoint = options?.endpoint;
    this.status = options?.status;
  }
}

export class KickAuthError extends KickBaseError {
  public readonly code = 'KICK_AUTH_ERROR';
  public readonly userTitle = 'Error de Autenticación con KICK';
  public readonly userMessage =
    'No fue posible autorizar la solicitud. Las credenciales de API (Client ID / Token) no son válidas o han expirado.';

  constructor(message = 'Fallo de autenticación OAuth 2.1 con id.kick.com', options?: { endpoint?: string; status?: number }) {
    super(message, { ...options, status: options?.status || 401 });
  }
}

export class KickRateLimitError extends KickBaseError {
  public readonly code = 'KICK_RATE_LIMIT_ERROR';
  public readonly userTitle = 'Límite de Solicitudes Alcanzado';
  public readonly userMessage =
    'Límite de solicitudes alcanzado (HTTP 429). La sincronización se reintentará posteriormente aplicando backoff exponencial.';
  public readonly retryAfterSeconds?: number;

  constructor(
    message = 'Rate limit de KICK excedido (HTTP 429)',
    options?: { endpoint?: string; status?: number; retryAfterSeconds?: number }
  ) {
    super(message, { ...options, status: 429 });
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export class KickNotFoundError extends KickBaseError {
  public readonly code = 'KICK_NOT_FOUND_ERROR';
  public readonly userTitle = 'Recurso No Encontrado en KICK';
  public readonly userMessage =
    'El canal, usuario o categoría solicitada no existe o no se encuentra público en la plataforma KICK.';

  constructor(message = 'Recurso no encontrado en KICK (HTTP 404)', options?: { endpoint?: string }) {
    super(message, { ...options, status: 404 });
  }
}

export class KickForbiddenError extends KickBaseError {
  public readonly code = 'KICK_FORBIDDEN_ERROR';
  public readonly userTitle = 'Acceso Denegado / Sin Permisos';
  public readonly userMessage =
    'El endpoint solicitado en KICK requiere permisos o scopes adicionales que no han sido autorizados para este cliente.';

  constructor(message = 'Acceso restringido en KICK API (HTTP 403)', options?: { endpoint?: string }) {
    super(message, { ...options, status: 403 });
  }
}

export class KickTimeoutError extends KickBaseError {
  public readonly code = 'KICK_TIMEOUT_ERROR';
  public readonly userTitle = 'Tiempo de Espera Agotado';
  public readonly userMessage =
    'La solicitud a KICK excedió el tiempo máximo de espera configurado. El servicio de KICK podría estar experimentando latencia.';

  constructor(message = 'Timeout al conectar con servidores de KICK', options?: { endpoint?: string }) {
    super(message, options);
  }
}

export class KickNetworkError extends KickBaseError {
  public readonly code = 'KICK_NETWORK_ERROR';
  public readonly userTitle = 'Error de Conexión de Red';
  public readonly userMessage =
    'No fue posible consultar KICK en este momento. Verifique su conexión de red o la disponibilidad de api.kick.com.';

  constructor(message = 'Error de red al conectar con KICK API', options?: { endpoint?: string }) {
    super(message, options);
  }
}

export class KickInvalidResponseError extends KickBaseError {
  public readonly code = 'KICK_INVALID_RESPONSE_ERROR';
  public readonly userTitle = 'Respuesta de API No Válida';
  public readonly userMessage =
    'La API de KICK devolvió una respuesta con estructura inesperada o formato no compatible con el modelo interno.';

  constructor(message = 'Estructura JSON inválida devuelta por KICK API', options?: { endpoint?: string; status?: number }) {
    super(message, options);
  }
}

export class KickUnsupportedMetricError extends KickBaseError {
  public readonly code = 'KICK_UNSUPPORTED_METRIC_ERROR';
  public readonly userTitle = 'Métrica No Disponible Oficialmente';
  public readonly userMessage =
    'Esta métrica no está disponible mediante la integración oficial conectada de KICK. Permanece como NO DISPONIBLE.';

  constructor(metricName: string) {
    super(`La métrica '${metricName}' no es provista por la API oficial documentada de KICK.`);
  }
}

export class KickApiError extends KickBaseError {
  public readonly code = 'KICK_API_GENERIC_ERROR';
  public readonly userTitle = 'Error en KICK Public API';
  public readonly userMessage =
    'Ocurrió una anomalía al comunicarse con la API de KICK. Se ha registrado en la auditoría técnica.';

  constructor(message: string, options?: { endpoint?: string; status?: number }) {
    super(message, options);
  }
}
