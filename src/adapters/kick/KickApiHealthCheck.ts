/**
 * KICK ANALYTICS MX — KICK API HEALTH CHECK (Fase 5, Req 13)
 * Servicio de diagnóstico y comprobación de estado de salud en tiempo real
 * para la conexión con KICK Public API oficial.
 */

import { KickApiClient } from './KickApiClient';
import { KickApiConfig } from './KickApiConfig';
import { KickBaseError } from './KickErrors';

export interface HealthCheckResult {
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'UNAVAILABLE';
  isConfigured: boolean;
  isAuthOk: boolean;
  isApiAvailable: boolean;
  latencyMs: number;
  lastCheckedAt: string;
  checkedEndpoint: string;
  authMethod: string;
  recentErrors: string[];
  diagnosticMessage: string;
  badgeColor: 'emerald' | 'amber' | 'red' | 'zinc';
}

export class KickApiHealthCheck {
  public static async runDiagnostics(): Promise<HealthCheckResult> {
    const config = KickApiConfig.getInstance();
    const client = KickApiClient.getInstance();
    const configData = config.getConfig();
    const nowIso = new Date().toISOString();
    const recentErrors: string[] = [];

    // 1. Comprobar configuración
    if (!config.isConfigured()) {
      return {
        status: 'NOT_CONFIGURED',
        isConfigured: false,
        isAuthOk: false,
        isApiAvailable: false,
        latencyMs: 0,
        lastCheckedAt: nowIso,
        checkedEndpoint: configData.apiBaseUrl,
        authMethod: configData.authMethod,
        recentErrors: [
          'No se han proporcionado credenciales para el conector oficial.',
          'KICK ANALYTICS MX funciona en modo local/manual mientras el conector no esté configurado.',
        ],
        diagnosticMessage: 'Conector no configurado. Requiere credenciales oficiales (Client ID / Token / Proxy).',
        badgeColor: 'zinc',
      };
    }

    // 2. Medir latencia y conectividad
    const startTime = performance.now();
    let isAuthOk = false;
    let isApiAvailable = false;
    let latencyMs = 0;
    const checkedEndpoint = `${configData.apiBaseUrl}/categories`;

    try {
      // Probar autenticación
      await client.authenticate();
      isAuthOk = true;

      // Probar llamada ligera al endpoint de categorías oficial
      await client.request('/categories', { params: { limit: 1 }, skipCache: true });
      isApiAvailable = true;
      latencyMs = Math.round(performance.now() - startTime);

      return {
        status: 'CONNECTED',
        isConfigured: true,
        isAuthOk: true,
        isApiAvailable: true,
        latencyMs,
        lastCheckedAt: nowIso,
        checkedEndpoint,
        authMethod: configData.authMethod,
        recentErrors: [],
        diagnosticMessage: `Conexión oficial activa con KICK API (${latencyMs} ms). Autenticación OAuth 2.1 verificada.`,
        badgeColor: 'emerald',
      };
    } catch (err: unknown) {
      latencyMs = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : String(err);
      recentErrors.push(errMsg);

      if (err instanceof KickBaseError) {
        if (err.code === 'KICK_AUTH_ERROR') {
          return {
            status: 'UNAUTHORIZED',
            isConfigured: true,
            isAuthOk: false,
            isApiAvailable: false,
            latencyMs,
            lastCheckedAt: nowIso,
            checkedEndpoint,
            authMethod: configData.authMethod,
            recentErrors,
            diagnosticMessage: 'Error de autorización (401). El token ha caducado o las credenciales son incorrectas.',
            badgeColor: 'amber',
          };
        }
        if (err.code === 'KICK_RATE_LIMIT_ERROR') {
          return {
            status: 'RATE_LIMITED',
            isConfigured: true,
            isAuthOk,
            isApiAvailable: false,
            latencyMs,
            lastCheckedAt: nowIso,
            checkedEndpoint,
            authMethod: configData.authMethod,
            recentErrors,
            diagnosticMessage: 'Rate limit de KICK alcanzado (429). Conector en pausa de protección temporal.',
            badgeColor: 'amber',
          };
        }
      }

      return {
        status: 'UNAVAILABLE',
        isConfigured: true,
        isAuthOk,
        isApiAvailable: false,
        latencyMs,
        lastCheckedAt: nowIso,
        checkedEndpoint,
        authMethod: configData.authMethod,
        recentErrors,
        diagnosticMessage: `KICK API no disponible en este momento. Causa: ${errMsg}`,
        badgeColor: 'red',
      };
    }
  }
}
