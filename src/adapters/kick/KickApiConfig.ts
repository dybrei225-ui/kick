/**
 * KICK ANALYTICS MX — KICK API CONFIGURATION (Fase 5, Reqs 3, 4, 30, 31)
 * Configuración centralizada y segura del conector con KICK Public API.
 * 
 * GARANTÍA DE SEGURIDAD ABSOLUTA:
 * - NO almacena Client Secret en localStorage, sessionStorage, IndexedDB ni exportables.
 * - Los tokens se redactan en registros y logs.
 * - Si no hay un proxy de backend seguro configurado, advierte explícitamente:
 *   "CONEXIÓN API REQUIERE ENTORNO SEGURO PARA CREDENCIALES".
 */

export type KickAuthMethod = 'client_credentials' | 'bearer_token' | 'backend_proxy';
export type KickConnectionMode = 'DIRECT' | 'PROXY' | 'MANUAL_TOKEN';

export interface KickApiConfigData {
  apiBaseUrl: string;
  authUrl: string;
  clientId: string;
  authMethod: KickAuthMethod;
  connectionMode: KickConnectionMode;
  proxyUrl?: string;
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  pageSize: number;
  syncFrequencyMinutes: number;
  cacheTtlMs: number;
  requireSecureEnvironmentNotice: boolean;
}

const CONFIG_STORAGE_KEY = 'kick_analytics_mx_api_config_v1';

export class KickApiConfig {
  private static instance: KickApiConfig;

  // En memoria solamente: nunca persistir el secret en disco/almacenamiento cliente
  private inMemoryClientSecret: string | null = null;
  private inMemoryAccessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  private config: KickApiConfigData = {
    apiBaseUrl: 'https://api.kick.com/public/v1',
    authUrl: 'https://id.kick.com/oauth/token',
    clientId: '',
    authMethod: 'bearer_token',
    connectionMode: 'DIRECT',
    proxyUrl: '/api/kick',
    timeoutMs: 10000,
    maxRetries: 3,
    backoffBaseMs: 1000,
    pageSize: 25,
    syncFrequencyMinutes: 60,
    cacheTtlMs: 5 * 60 * 1000, // 5 minutos de TTL de acuerdo a las directrices
    requireSecureEnvironmentNotice: true,
  };

  private constructor() {
    this.loadPersistedConfig();
  }

  public static getInstance(): KickApiConfig {
    if (!KickApiConfig.instance) {
      KickApiConfig.instance = new KickApiConfig();
    }
    return KickApiConfig.instance;
  }

  private loadPersistedConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Filtrar estrictamente cualquier campo no seguro
        delete parsed.clientSecret;
        delete parsed.inMemoryClientSecret;
        this.config = {
          ...this.config,
          ...parsed,
        };
      }
    } catch {
      // Usar valores por defecto seguros
    }
  }

  public saveConfig(updates: Partial<KickApiConfigData>): void {
    // Sanitizar antes de guardar: NUNCA guardar client secrets
    const safeData: Partial<KickApiConfigData> = {
      apiBaseUrl: updates.apiBaseUrl || this.config.apiBaseUrl,
      authUrl: updates.authUrl || this.config.authUrl,
      clientId: updates.clientId !== undefined ? updates.clientId.trim() : this.config.clientId,
      authMethod: updates.authMethod || this.config.authMethod,
      connectionMode: updates.connectionMode || this.config.connectionMode,
      proxyUrl: updates.proxyUrl || this.config.proxyUrl,
      timeoutMs: updates.timeoutMs ?? this.config.timeoutMs,
      maxRetries: updates.maxRetries ?? this.config.maxRetries,
      backoffBaseMs: updates.backoffBaseMs ?? this.config.backoffBaseMs,
      pageSize: updates.pageSize ?? this.config.pageSize,
      syncFrequencyMinutes: updates.syncFrequencyMinutes ?? this.config.syncFrequencyMinutes,
      cacheTtlMs: updates.cacheTtlMs ?? this.config.cacheTtlMs,
      requireSecureEnvironmentNotice: true,
    };

    this.config = {
      ...this.config,
      ...safeData,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      } catch (err) {
        console.warn('[KickApiConfig] No se pudo persistir la configuración segura', err);
      }
    }
  }

  public getConfig(): Readonly<KickApiConfigData> {
    return { ...this.config };
  }

  /**
   * Manejo seguro de Client Secret:
   * Solo reside en memoria volatil durante la sesion activa.
   * Se destruye al refrescar o cerrar navegador.
   */
  public setSessionSecret(secret: string | null): void {
    this.inMemoryClientSecret = secret ? secret.trim() : null;
  }

  public getSessionSecret(): string | null {
    return this.inMemoryClientSecret;
  }

  public hasSessionSecret(): boolean {
    return !!this.inMemoryClientSecret && this.inMemoryClientSecret.length > 0;
  }

  public setAccessToken(token: string | null, expiresInSeconds?: number): void {
    this.inMemoryAccessToken = token ? token.trim() : null;
    if (token && expiresInSeconds) {
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000 - 30000; // 30s de margen
    } else if (!token) {
      this.tokenExpiresAt = null;
    }
  }

  public getAccessToken(): string | null {
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt) {
      this.inMemoryAccessToken = null;
      this.tokenExpiresAt = null;
      return null;
    }
    return this.inMemoryAccessToken;
  }

  public isTokenExpired(): boolean {
    if (!this.inMemoryAccessToken) return true;
    if (!this.tokenExpiresAt) return false;
    return Date.now() > this.tokenExpiresAt;
  }

  public isConfigured(): boolean {
    if (this.config.authMethod === 'backend_proxy') {
      return !!this.config.proxyUrl;
    }
    if (this.config.authMethod === 'bearer_token') {
      return !!this.inMemoryAccessToken;
    }
    if (this.config.authMethod === 'client_credentials') {
      return !!this.config.clientId && !!this.inMemoryClientSecret;
    }
    return false;
  }

  /**
   * Redacta tokens y secretos para salida de logs seguros (Req 31)
   */
  public static redactSecret(value?: string | null): string {
    if (!value) return '(vacío)';
    if (value.length <= 8) return '********';
    return `${value.substring(0, 4)}...********...${value.substring(value.length - 4)}`;
  }

  public static redactAuthHeader(headerValue?: string | null): string {
    if (!headerValue) return '(ninguno)';
    if (headerValue.toLowerCase().startsWith('bearer ')) {
      return 'Bearer ********';
    }
    return '********';
  }
}
