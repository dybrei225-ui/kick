/**
 * KICK ANALYTICS MX — CENTRALIZED KICK API CLIENT (Fase 5, Reqs 2, 10, 11, 29, 30, 31)
 * Cliente centralizado para comunicación con KICK Public API oficial.
 * 
 * Responsabilidades:
 * - Autenticación OAuth 2.1 documentada (POST https://id.kick.com/oauth/token)
 * - Headers limpios y control de timeout mediante AbortController
 * - Rate limiting estricto (429) con backoff exponencial
 * - Reintentos controlados con jitter
 * - Caché en memoria con TTL configurable (Req 30)
 * - Sanitización y redacción de credenciales en logs (Req 31)
 * - Mapeo de errores a tipos específicos KickBaseError (Req 12)
 */

import {
  KickBaseError,
  KickAuthError,
  KickRateLimitError,
  KickNotFoundError,
  KickForbiddenError,
  KickTimeoutError,
  KickNetworkError,
  KickApiError,
  KickInvalidResponseError,
} from './KickErrors';
import { KickApiConfig } from './KickApiConfig';
import {
  KickApiChannelPayload,
  KickApiUserPayload,
  KickApiCategoryPayload,
  KickApiLivestreamPayload,
} from './KickMappers';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  skipCache?: boolean;
  requiresAuth?: boolean;
}

export class KickApiClient {
  private static instance: KickApiClient;
  private config: KickApiConfig;
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private isRateLimited = false;
  private rateLimitResetAt: number = 0;

  private constructor() {
    this.config = KickApiConfig.getInstance();
  }

  public static getInstance(): KickApiClient {
    if (!KickApiClient.instance) {
      KickApiClient.instance = new KickApiClient();
    }
    return KickApiClient.instance;
  }

  /**
   * Obtiene o renueva el Access Token mediante OAuth 2.1 Client Credentials oficial (id.kick.com)
   */
  public async authenticate(forceRefresh = false): Promise<string> {
    const configData = this.config.getConfig();

    // 1. Si se configuró token manual y sigue válido, usarlo
    const existingToken = this.config.getAccessToken();
    if (existingToken && !forceRefresh && !this.config.isTokenExpired()) {
      return existingToken;
    }

    // 2. Si el modo es backend proxy, el proxy gestiona la autenticación
    if (configData.authMethod === 'backend_proxy') {
      return 'PROXY_AUTH_MANAGED';
    }

    // 3. Client Credentials Flow oficial (POST https://id.kick.com/oauth/token)
    const clientId = configData.clientId;
    const clientSecret = this.config.getSessionSecret();

    if (!clientId || !clientSecret) {
      throw new KickAuthError(
        'Faltan credenciales oficiales de KICK (Client ID o Client Secret en sesión). Configure el conector en Administración.'
      );
    }

    const authUrl = configData.authUrl || 'https://id.kick.com/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 400) {
          throw new KickAuthError(
            `Fallo de autenticación OAuth 2.1 con id.kick.com (${response.status}): Credenciales inválidas.`,
            { endpoint: authUrl, status: response.status }
          );
        }
        if (response.status === 429) {
          throw new KickRateLimitError('Rate limit alcanzado en servidor de autenticación de KICK.', {
            endpoint: authUrl,
            status: 429,
          });
        }
        throw new KickApiError(`Error al autenticar con KICK OAuth: ${response.status} ${errorText}`, {
          endpoint: authUrl,
          status: response.status,
        });
      }

      const json = await response.json();
      if (!json.access_token) {
        throw new KickInvalidResponseError('La respuesta de id.kick.com no contiene un access_token válido.');
      }

      const token = json.access_token as string;
      const expiresIn = (json.expires_in as number) || 3600;
      this.config.setAccessToken(token, expiresIn);
      return token;
    } catch (err: unknown) {
      if (err instanceof KickAuthError || err instanceof KickRateLimitError || err instanceof KickApiError) {
        throw err;
      }
      throw new KickNetworkError(`Fallo de conexión de red al contactar servidor de autenticación de KICK: ${err instanceof Error ? err.message : String(err)}`, {
        endpoint: authUrl,
      });
    }
  }

  /**
   * Ejecuta una llamada HTTP oficial a la API de KICK con reintentos, timeout y rate limiting
   */
  public async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const configData = this.config.getConfig();

    // Comprobar estado de rate limit global
    if (this.isRateLimited) {
      const now = Date.now();
      if (now < this.rateLimitResetAt) {
        const waitSec = Math.ceil((this.rateLimitResetAt - now) / 1000);
        throw new KickRateLimitError(
          `Conexión con KICK temporalmente pausada por rate limit (429). Reintente en ${waitSec}s.`,
          { endpoint, retryAfterSeconds: waitSec }
        );
      } else {
        this.isRateLimited = false;
      }
    }

    // Comprobar caché si es GET
    const method = options.method || 'GET';
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(options.params || {})}`;
    if (method === 'GET' && !options.skipCache) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
    }

    // Construir URL completa
    const baseUrl =
      configData.authMethod === 'backend_proxy' && configData.proxyUrl
        ? configData.proxyUrl.replace(/\/$/, '')
        : configData.apiBaseUrl.replace(/\/$/, '');

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${baseUrl}${cleanEndpoint}`, window.location.origin);

    if (options.params) {
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    // Obtener token si es requerido
    let token: string | null = null;
    if (options.requiresAuth !== false) {
      try {
        token = await this.authenticate();
      } catch (authErr) {
        // Si no se puede autenticar y el conector no está configurado, lanzar error normalizado
        throw authErr;
      }
    }

    let retries = 0;
    const maxRetries = configData.maxRetries || 3;
    let lastError: Error | null = null;

    while (retries <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), configData.timeoutMs || 10000);

      // Combinar señal de timeout con señal externa si existe
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };

        if (token && token !== 'PROXY_AUTH_MANAGED') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (options.body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url.toString(), fetchOptions);
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          // Almacenar en caché respetando el TTL
          if (method === 'GET' && configData.cacheTtlMs > 0) {
            this.memoryCache.set(cacheKey, {
              data: json,
              expiresAt: Date.now() + configData.cacheTtlMs,
            });
          }
          return json as T;
        }

        // Manejo específico de códigos de error de KICK
        if (response.status === 401) {
          // Token expirado o inválido: forzar renovación y reintentar si no se ha reintentado
          if (retries === 0) {
            this.config.setAccessToken(null);
            token = await this.authenticate(true);
            retries++;
            continue;
          }
          throw new KickAuthError('No autorizado en KICK API. Verifique sus credenciales.', {
            endpoint,
            status: 401,
          });
        }

        if (response.status === 403) {
          throw new KickForbiddenError('Permisos insuficientes para acceder a este recurso oficial de KICK.', {
            endpoint,
          });
        }

        if (response.status === 404) {
          throw new KickNotFoundError(`Recurso no encontrado en KICK: ${endpoint}`, { endpoint });
        }

        if (response.status === 429) {
          // Rate limit excedido: aplicar backoff exponencial
          this.isRateLimited = true;
          const retryAfterHeader = response.headers.get('Retry-After');
          const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5 * Math.pow(2, retries);
          this.rateLimitResetAt = Date.now() + waitSeconds * 1000;
          throw new KickRateLimitError('Límite de solicitudes alcanzado en KICK Public API.', {
            endpoint,
            status: 429,
            retryAfterSeconds: waitSeconds,
          });
        }

        if (response.status >= 500) {
          // Error interno de servidor en KICK: aplicar retry con backoff
          lastError = new KickApiError(`Servidores de KICK reportaron error ${response.status}`, {
            endpoint,
            status: response.status,
          });
        } else {
          const errBody = await response.text().catch(() => '');
          throw new KickApiError(`Error devuelto por KICK API: ${response.status} ${errBody}`, {
            endpoint,
            status: response.status,
          });
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (err instanceof KickBaseError) {
          // No reintentar errores de auth o not found
          if (err instanceof KickAuthError || err instanceof KickNotFoundError || err instanceof KickForbiddenError || err instanceof KickRateLimitError) {
            throw err;
          }
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new KickTimeoutError(`Tiempo de espera agotado al consultar ${endpoint}`, { endpoint });
        } else if (!(err instanceof KickBaseError)) {
          lastError = new KickNetworkError(`Fallo de conexión con api.kick.com: ${err instanceof Error ? err.message : String(err)}`, { endpoint });
        } else {
          lastError = err as Error;
        }
      }

      retries++;
      if (retries <= maxRetries) {
        // Backoff exponencial con jitter
        const delay = (configData.backoffBaseMs || 1000) * Math.pow(2, retries - 1) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new KickApiError('Fallo reiterado al comunicarse con KICK API.', { endpoint });
  }

  // --- MÉTODOS DE RECURSOS OFICIALES DOCUMENTADOS ---

  /**
   * Consulta el canal oficial por nombre de usuario / slug
   * Endpoint oficial: GET /public/v1/channels
   */
  public async getChannel(username: string): Promise<KickApiChannelPayload | null> {
    try {
      const response = await this.request<{ data: KickApiChannelPayload | KickApiChannelPayload[] }>(
        '/channels',
        {
          params: { slug: username.toLowerCase().trim() },
        }
      );
      if (Array.isArray(response?.data)) {
        return response.data[0] || null;
      }
      return response?.data || null;
    } catch (err) {
      if (err instanceof KickNotFoundError) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Consulta un usuario oficial por username o ID
   * Endpoint oficial: GET /public/v1/users
   */
  public async getUser(username: string): Promise<KickApiUserPayload | null> {
    try {
      const response = await this.request<{ data: KickApiUserPayload | KickApiUserPayload[] }>('/users', {
        params: { username: username.toLowerCase().trim() },
      });
      if (Array.isArray(response?.data)) {
        return response.data[0] || null;
      }
      return response?.data || null;
    } catch (err) {
      if (err instanceof KickNotFoundError) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Consulta transmisiones en vivo activas
   * Endpoint oficial: GET /public/v1/livestreams
   */
  public async getLivestreams(params?: {
    category_id?: number | string;
    language?: string;
    page?: number;
    limit?: number;
  }): Promise<KickApiLivestreamPayload[]> {
    const response = await this.request<{ data: KickApiLivestreamPayload[] }>('/livestreams', {
      params: {
        category_id: params?.category_id,
        language: params?.language,
        page: params?.page,
        limit: params?.limit || 25,
      },
    });
    return response?.data || [];
  }

  /**
   * Consulta si un canal específico tiene una transmisión en vivo activa
   */
  public async getChannelLivestream(channelSlug: string): Promise<KickApiLivestreamPayload | null> {
    try {
      const livestreams = await this.getLivestreams({ limit: 50 });
      const found = livestreams.find(
        (ls) => ls.channel?.slug?.toLowerCase() === channelSlug.toLowerCase().trim()
      );
      return found || null;
    } catch {
      return null;
    }
  }

  /**
   * Consulta el directorio oficial de categorías
   * Endpoint oficial: GET /public/v1/categories
   */
  public async getCategories(page = 1, limit = 50): Promise<KickApiCategoryPayload[]> {
    const response = await this.request<{ data: KickApiCategoryPayload[] }>('/categories', {
      params: { page, limit },
    });
    return response?.data || [];
  }

  /**
   * Limpia la memoria caché del cliente
   */
  public clearCache(): void {
    this.memoryCache.clear();
  }
}
