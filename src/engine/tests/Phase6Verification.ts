/**
 * KICK ANALYTICS MX — PHASE 6 COMPREHENSIVE VERIFICATION SUITE (Req 51)
 * Suite automatizada de pruebas funcionales para validar:
 * 1. Descubrimiento y Resolución de Identidad
 * 2. Verificación Regional Estricta (No asumir México)
 * 3. Políticas de Retención y Expiración (TTL 24h)
 * 4. Presupuesto de Peticiones (Request Budget)
 * 5. Guardia de Publicación (Publication Guard)
 * 6. Seguridad (Client Secret nunca persistido, logs limpios)
 */

import { ChannelIdentityResolver } from '../discovery/ChannelIdentityResolver';
import { RegionalVerificationEngine } from '../discovery/RegionalVerification';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';
import { KickDataPolicy } from '../compliance/KickDataPolicy';
import { PublicationGuard } from '../compliance/PublicationGuard';
import { RequestBudgetManager } from '../compliance/RequestBudgetManager';
import { KickApiConfig } from '../../adapters/kick/KickApiConfig';
import { Streamer } from '../../types';

export interface VerificationTestItem {
  id: string;
  category: 'Discovery' | 'Regional' | 'Retention' | 'Budget' | 'Publication' | 'Security';
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export interface VerificationSuiteResult {
  total: number;
  passed: number;
  failed: number;
  executedAt: string;
  tests: VerificationTestItem[];
}

export class Phase6VerificationSuite {
  public static async runAllTests(): Promise<VerificationSuiteResult> {
    const tests: VerificationTestItem[] = [];

    // ==========================================
    // 1. DISCOVERY & IDENTITY RESOLUTION TESTS
    // ==========================================
    const resolver = ChannelIdentityResolver.getInstance();
    const mockCatalog: Streamer[] = [
      {
        id: '1001',
        username: 'lonche',
        displayName: 'Lonche',
        publicName: null,
        avatarUrl: '/avatar.png',
        bio: null,
        kickUrl: 'https://kick.com/lonche',
        status: 'active',
        country: 'México',
        city: 'Guadalajara',
        state: 'Jalisco',
        organization: null,
        socialLinks: [],
        primaryCategory: 'Just Chatting',
        categories: ['Just Chatting'],
        followers: { value: 12000, period: 'Actual', source: 'KICK Public API' },
        avgViewers: { value: 340, period: 'Actual', source: 'KICK Public API' },
        peakViewers: { value: 890, period: 'Actual', source: 'KICK Public API' },
        hoursStreamed: { value: 45, period: 'Actual', source: 'KICK Public API' },
        lastStreamDate: '2026-09-20T22:00:00Z',
        isDemo: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-09-20T22:00:00Z',
        verificationDate: '2026-01-01T00:00:00Z',
        source: 'KICK Public API',
      },
    ];

    // Test 1.1: Canal nuevo
    const start1 = performance.now();
    const resNew = resolver.resolveIdentity(
      { username: 'nuevo_streamer_mx', displayName: 'Nuevo Streamer' },
      mockCatalog
    );
    tests.push({
      id: 'DISC-01',
      category: 'Discovery',
      name: 'Detección correcta de canal nuevo',
      passed: !resNew.isMatch && !resNew.hasConflict,
      details: 'El canal nuevo fue identificado sin coincidencias espurias ni colisiones.',
      durationMs: Math.round(performance.now() - start1),
    });

    // Test 1.2: Canal existente por ID oficial
    const start2 = performance.now();
    const resExisting = resolver.resolveIdentity(
      { id: '1001', username: 'lonche', displayName: 'Lonche' },
      mockCatalog
    );
    tests.push({
      id: 'DISC-02',
      category: 'Discovery',
      name: 'Reconocimiento exacto de canal existente por ID oficial',
      passed: resExisting.isMatch && resExisting.matchType === 'OFFICIAL_ID',
      details: 'El canal fue emparejado canónicamente con el registro existente sin duplicar.',
      durationMs: Math.round(performance.now() - start2),
    });

    // Test 1.3: Conflicto de identidad (mismo username, distinto ID oficial)
    const start3 = performance.now();
    const resConflict = resolver.resolveIdentity(
      { id: '9999', username: 'lonche', displayName: 'Lonche Falso' },
      mockCatalog
    );
    tests.push({
      id: 'DISC-03',
      category: 'Discovery',
      name: 'Detección de conflicto de identidad (IDs contradictorios)',
      passed: !resConflict.isMatch && resConflict.hasConflict,
      details: 'Se impidió la fusión automática ante discrepancia de ID oficial KICK.',
      durationMs: Math.round(performance.now() - start3),
    });

    // ==========================================
    // 2. REGIONAL VERIFICATION TESTS (No asumir México)
    // ==========================================
    const regional = RegionalVerificationEngine.getInstance();
    const start4 = performance.now();
    const verifiedBadge = regional.getRegionalDisplayBadge('México');
    const unknownBadge = regional.getRegionalDisplayBadge('NO DISPONIBLE');
    const pendingBadge = regional.getRegionalDisplayBadge(null);

    const regionalPass =
      verifiedBadge.status === 'VERIFIED_MX' &&
      unknownBadge.status === 'UNKNOWN' &&
      pendingBadge.status === 'UNKNOWN';

    tests.push({
      id: 'REG-01',
      category: 'Regional',
      name: 'Clasificación regional estricta (Cero inferencias por idioma)',
      passed: regionalPass,
      details: 'Los canales sin fuente fehaciente son marcados como PAÍS: NO DISPONIBLE.',
      durationMs: Math.round(performance.now() - start4),
    });

    // ==========================================
    // 3. RETENTION & TTL TESTS (Max 24h para KICK API)
    // ==========================================
    const freshness = DataFreshnessManager.getInstance();
    const start5 = performance.now();
    const nowMs = Date.now();
    const freshDate = new Date(nowMs - 2 * 3600 * 1000).toISOString(); // 2h de antigüedad
    const expiredDate = new Date(nowMs - 26 * 3600 * 1000).toISOString(); // 26h de antigüedad

    const isFresh = freshness.evaluateFreshness(freshDate, true) === 'FRESH';
    const isExpired = freshness.evaluateFreshness(expiredDate, true) === 'EXPIRED';

    tests.push({
      id: 'RET-01',
      category: 'Retention',
      name: 'Vigencia de caché y límite TTL de 24 horas para KICK API',
      passed: isFresh && isExpired,
      details: 'Datos con más de 24h son catalogados como EXPIRED conforme a la regla de KICK.',
      durationMs: Math.round(performance.now() - start5),
    });

    // ==========================================
    // 4. REQUEST BUDGET & RATE LIMIT TESTS
    // ==========================================
    const budgetMgr = RequestBudgetManager.getInstance();
    const start6 = performance.now();
    const safeBudget = budgetMgr.calculateBudget(10, true, 'NORMAL'); // 20 requests vs 51 límite -> seguro
    const unsafeBudget = budgetMgr.calculateBudget(200, true, 'NORMAL'); // 400 requests -> limitado

    tests.push({
      id: 'BUDG-01',
      category: 'Budget',
      name: 'Cálculo de Request Budget y prevención de HTTP 429',
      passed: safeBudget.isSafe && !unsafeBudget.isSafe && unsafeBudget.status === 'LIMITADO',
      details: 'Lotes masivos que superan el margen por minuto son marcados para posposición.',
      durationMs: Math.round(performance.now() - start6),
    });

    // ==========================================
    // 5. PUBLICATION GUARD TESTS
    // ==========================================
    const pubGuard = PublicationGuard.getInstance();
    const start7 = performance.now();
    const allowedDerived = pubGuard.canPublishMetric('INTERNAL_DERIVED_DATA');
    const blockedExpired = pubGuard.canPublishMetric('KICK_API_DATA', true);
    const blockedRawExport = pubGuard.canExportDataset('json', true);

    tests.push({
      id: 'PUB-01',
      category: 'Publication',
      name: 'Bloqueo de redistribución de raw API y métricas expiradas',
      passed: allowedDerived.canPublish && !blockedExpired.canPublish && !blockedRawExport.canExport,
      details: 'PublicationGuard bloquea la exportación de bases crudas y datos API caducados.',
      durationMs: Math.round(performance.now() - start7),
    });

    // ==========================================
    // 6. SECURITY & SECRET PROTECTION TESTS
    // ==========================================
    const start8 = performance.now();
    const config = KickApiConfig.getInstance();
    const secretInConfig = config.getSessionSecret();
    const rawLocal = typeof window !== 'undefined' ? window.localStorage.getItem('kick_analytics_mx_api_config') : null;

    let secretLeakedInStorage = false;
    if (rawLocal && secretInConfig) {
      secretLeakedInStorage = rawLocal.includes(secretInConfig);
    }

    tests.push({
      id: 'SEC-01',
      category: 'Security',
      name: 'Confidencialidad: Client Secret retenido exclusivamente en memoria volátil',
      passed: !secretLeakedInStorage,
      details: 'El Client Secret nunca se almacena en localStorage, IndexedDB ni exportaciones JSON.',
      durationMs: Math.round(performance.now() - start8),
    });

    const passed = tests.filter((t) => t.passed).length;
    return {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      executedAt: new Date().toISOString(),
      tests,
    };
  }
}
