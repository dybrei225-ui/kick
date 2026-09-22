/**
 * KICK ANALYTICS MX — REAL KICK DATA PROVIDER (Fase 5, Reqs 1, 9, 10, 16, 17, 39, 40)
 * Implementación oficial de KickDataProvider para datos reales obtenidos de KICK Public API.
 * 
 * Arquitectura:
 * KickDataProvider
 *        │
 *        ├── MockKickDataProvider
 *        ├── ManualKickDataProvider
 *        └── RealKickDataProvider
 *                  │
 *                  └── KICK Public API (vía KickApiClient & KickSyncQueue)
 */

import { KickDataProvider, DataProviderMetadata } from './KickDataProvider';
import {
  Streamer,
  ChannelSnapshot,
  CategoryData,
  RegionMetric,
  AlertRule,
  AuditLog,
  QualityAuditReport,
  QualityIssue,
} from '../types';
import { KickApiClient } from './kick/KickApiClient';
import { KickApiConfig } from './kick/KickApiConfig';
import { KickSyncQueue, SyncProgressItem } from './kick/KickSyncQueue';
import { KickSyncLogger, SyncType } from './kick/KickSyncLogger';
import { KickChannelMapper, KickCategoryMapper } from './kick/KickMappers';
import { syncManager, IngestionPreviewResult } from '../engine/SyncManager';
import { appStorage } from './storage/StorageAdapter';
import { SEED_CATEGORIES } from '../data/seedData';
import { Normalizer } from '../engine/Normalizer';

const REAL_STORAGE_KEY = 'kick_analytics_mx_real_provider_v1';

export class RealKickDataProvider implements KickDataProvider {
  private streamers: Streamer[] = [];
  private snapshots: ChannelSnapshot[] = [];
  private categories: CategoryData[] = [...SEED_CATEGORIES];
  private regions: RegionMetric[] = [];
  private alerts: AlertRule[] = [];
  private logs: AuditLog[] = [];
  private lastSyncDate: string | null = null;
  private isLoaded = false;

  private client: KickApiClient;
  private config: KickApiConfig;
  private syncQueue: KickSyncQueue;
  private logger: KickSyncLogger;

  constructor() {
    this.client = KickApiClient.getInstance();
    this.config = KickApiConfig.getInstance();
    this.syncQueue = new KickSyncQueue();
    this.logger = KickSyncLogger.getInstance();
    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const stored = await appStorage.getItem(REAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.streamers)) this.streamers = parsed.streamers;
        if (Array.isArray(parsed.snapshots)) this.snapshots = parsed.snapshots;
        if (Array.isArray(parsed.categories)) this.categories = parsed.categories;
        if (Array.isArray(parsed.regions)) this.regions = parsed.regions;
        if (parsed.lastSyncDate) this.lastSyncDate = parsed.lastSyncDate;
      }
    } catch {
      // Usar estado limpio
    }
    this.isLoaded = true;
  }

  private async saveToStorage(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        streamers: this.streamers,
        snapshots: this.snapshots,
        categories: this.categories,
        regions: this.regions,
        lastSyncDate: this.lastSyncDate,
        updatedAt: new Date().toISOString(),
      };
      await appStorage.setItem(REAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[RealKickDataProvider] Error al guardar datos en almacenamiento', err);
    }
  }

  public getMetadata(): DataProviderMetadata {
    const isConfigured = this.config.isConfigured();
    return {
      providerName: 'RealKickDataProvider (KICK Public API Oficial)',
      providerType: 'real',
      isDemoMode: false,
      status: isConfigured ? 'active' : 'pending_connector',
      statusDescription: isConfigured
        ? 'Conectado a KICK Public API oficial mediante OAuth 2.1 documentado.'
        : 'Conector KICK oficial pendiente de configuración de credenciales.',
      lastSyncDate: this.lastSyncDate
        ? new Date(this.lastSyncDate).toLocaleString('es-MX')
        : 'Sin sincronización registrada aún',
      connectorNotice: isConfigured
        ? '● Conector KICK API activo (OAuth 2.1)'
        : '⚠ Ingrese credenciales de KICK API en Administración > Conectores para sincronizar.',
    };
  }

  public async getStreamers(): Promise<Streamer[]> {
    if (!this.isLoaded) await this.loadFromStorage();
    return [...this.streamers];
  }

  public async getStreamer(username: string): Promise<Streamer | null> {
    if (!this.isLoaded) await this.loadFromStorage();
    const normalized = Normalizer.normalizeUsername(username);
    const existing = this.streamers.find((s) => Normalizer.normalizeUsername(s.username) === normalized);
    return existing || null;
  }

  public async getSnapshots(streamerId: string, period?: string): Promise<ChannelSnapshot[]> {
    if (!this.isLoaded) await this.loadFromStorage();
    let snaps = this.snapshots.filter((s) => s.streamerId === streamerId || s.streamerUsername === streamerId);
    if (period && period !== 'all') {
      snaps = snaps.filter((s) => s.period.toLowerCase() === period.toLowerCase());
    }
    return [...snaps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async saveSnapshot(snapshot: ChannelSnapshot): Promise<ChannelSnapshot> {
    if (!this.isLoaded) await this.loadFromStorage();
    const existingIdx = this.snapshots.findIndex((s) => s.id === snapshot.id);
    if (existingIdx !== -1) {
      this.snapshots[existingIdx] = snapshot;
    } else {
      this.snapshots.unshift(snapshot);
    }
    await this.saveToStorage();
    return snapshot;
  }

  public async deleteSnapshot(id: string): Promise<boolean> {
    if (!this.isLoaded) await this.loadFromStorage();
    const initialLen = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    if (this.snapshots.length !== initialLen) {
      await this.saveToStorage();
      return true;
    }
    return false;
  }

  public async getCategories(): Promise<CategoryData[]> {
    if (!this.isLoaded) await this.loadFromStorage();
    return [...this.categories];
  }

  public async getRegionalPresence(): Promise<RegionMetric[]> {
    if (!this.isLoaded) await this.loadFromStorage();
    // Derivar de streamers confirmados en México
    const mexicanStreamers = this.streamers.filter((s) => s.country === 'México');
    const stateMap = new Map<string, Streamer[]>();

    mexicanStreamers.forEach((s) => {
      const state = s.state || 'Ubicación No Especificada';
      const list = stateMap.get(state) || [];
      list.push(s);
      stateMap.set(state, list);
    });

    const metrics: RegionMetric[] = [];
    stateMap.forEach((streamerList, state) => {
      const totalFollowers = streamerList.reduce((acc, curr) => acc + (curr.followers.value || 0), 0);
      const avgViewers = Math.round(
        streamerList.reduce((acc, curr) => acc + (curr.avgViewers.value || 0), 0) / (streamerList.length || 1)
      );

      metrics.push({
        state,
        confirmedChannels: streamerList.length,
        totalFollowers,
        avgViewers,
        topChannels: streamerList.slice(0, 3).map((s) => s.displayName),
        hasConfirmedLocation: state !== 'Ubicación No Especificada',
      });
    });

    return metrics;
  }

  public async getAlerts(): Promise<AlertRule[]> {
    return [...this.alerts];
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return [...this.logs];
  }

  public async saveStreamer(streamer: Partial<Streamer>): Promise<Streamer> {
    if (!this.isLoaded) await this.loadFromStorage();
    const username = Normalizer.normalizeUsername(streamer.username || '');
    const idx = this.streamers.findIndex((s) => Normalizer.normalizeUsername(s.username) === username);

    const now = new Date().toISOString();
    const fullStreamer = (idx !== -1 ? { ...this.streamers[idx], ...streamer } : streamer) as Streamer;
    fullStreamer.updatedAt = now;

    if (idx !== -1) {
      this.streamers[idx] = fullStreamer;
    } else {
      this.streamers.push(fullStreamer);
    }

    await this.saveToStorage();
    return fullStreamer;
  }

  public async deleteStreamer(id: string): Promise<boolean> {
    if (!this.isLoaded) await this.loadFromStorage();
    const initialLen = this.streamers.length;
    this.streamers = this.streamers.filter((s) => s.id !== id && s.username !== id);
    if (this.streamers.length !== initialLen) {
      await this.saveToStorage();
      return true;
    }
    return false;
  }

  public async importManualData(data: unknown): Promise<{ success: boolean; count: number; errors: string[] }> {
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, errors: ['Estructura de datos no válida'] };
    }
    const d = data as { streamers?: Streamer[]; snapshots?: ChannelSnapshot[] };
    let count = 0;
    if (Array.isArray(d.streamers)) {
      d.streamers.forEach((s) => {
        this.saveStreamer(s);
        count++;
      });
    }
    if (Array.isArray(d.snapshots)) {
      d.snapshots.forEach((snap) => {
        this.saveSnapshot(snap);
      });
    }
    return { success: true, count, errors: [] };
  }

  public async exportData(): Promise<string> {
    if (!this.isLoaded) await this.loadFromStorage();
    return JSON.stringify(
      {
        provider: 'RealKickDataProvider',
        exportedAt: new Date().toISOString(),
        streamers: this.streamers,
        snapshots: this.snapshots,
        categories: this.categories,
      },
      null,
      2
    );
  }

  public async resetToDemo(): Promise<void> {
    // En modo real no se inyecta demo falso.
  }

  public async runQualityAudit(): Promise<QualityAuditReport> {
    if (!this.isLoaded) await this.loadFromStorage();
    const issues: QualityIssue[] = [];

    this.streamers.forEach((s) => {
      if (s.followers.value === null) {
        issues.push({
          type: 'warning',
          category: 'missing',
          message: `El streamer @${s.username} no tiene contador de seguidores registrado.`,
          target: s.username,
        });
      }
    });

    return {
      totalChannels: this.streamers.length,
      validChannelsCount: this.streamers.filter((s) => s.followers.value !== null).length,
      withSourceCount: this.streamers.length,
      needsUpdateCount: 0,
      noHistoryCount: this.streamers.filter((s) => !this.snapshots.some((snap) => snap.streamerId === s.id)).length,
      incompleteCount: issues.length,
      duplicatesCount: 0,
      issues,
      auditedAt: new Date().toISOString(),
    };
  }

  // --- MÉTODOS DE SINCRONIZACIÓN OFICIAL REAL (Reqs 9, 10, 15, 16, 17) ---

  /**
   * Sincroniza un streamer individual directamente contra KICK Public API
   */
  public async syncSingleStreamer(username: string): Promise<{
    success: boolean;
    streamer: Streamer | null;
    snapshot: ChannelSnapshot | null;
    error?: string;
  }> {
    const startTime = new Date().toISOString();
    const startMs = performance.now();

    try {
      const channelRaw = await this.client.getChannel(username);
      if (!channelRaw) {
        await this.logger.recordExecution({
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          type: 'INDIVIDUAL',
          streamerTarget: username,
          source: 'KICK Public API',
          startTime,
          endTime: new Date().toISOString(),
          durationMs: Math.round(performance.now() - startMs),
          requestsCount: 1,
          successesCount: 0,
          errorsCount: 1,
          newRecordsCount: 0,
          updatedRecordsCount: 0,
          skippedRecordsCount: 1,
          errorMessages: [`El canal @${username} no existe en KICK.`],
          status: 'FAILED',
        });
        return { success: false, streamer: null, snapshot: null, error: `Canal @${username} no encontrado en KICK.` };
      }

      let liveRaw = null;
      try {
        liveRaw = await this.client.getChannelLivestream(username);
      } catch {}

      const existing = await this.getStreamer(username);
      const mappedStreamer = KickChannelMapper.mapToStreamer(channelRaw, liveRaw, existing);
      const mappedSnapshot = KickChannelMapper.mapToSnapshot(mappedStreamer, {
        notes: 'Sincronización individual manual vía KICK API',
        sourceEndpoint: 'GET /public/v1/channels',
      });

      // Pipeline transaccional SyncManager: PREVIEW y COMMIT
      const previewRes = await syncManager.preview(
        [mappedStreamer],
        [mappedSnapshot],
        this.streamers,
        this.snapshots,
        {
          sourceType: 'KICK_PUBLIC',
          sourceName: 'KICK Public API',
          sourceUrl: mappedStreamer.kickUrl,
          isDemo: false,
        }
      );

      const commitRes = await syncManager.apply(
        previewRes,
        this.streamers,
        this.snapshots,
        new Map() // Conflicto: REPLACE por defecto
      );

      this.streamers = commitRes.finalStreamers;
      this.snapshots = commitRes.finalSnapshots;
      this.lastSyncDate = new Date().toISOString();
      await this.saveToStorage();

      await this.logger.recordExecution({
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        type: 'INDIVIDUAL',
        streamerTarget: username,
        source: 'KICK Public API',
        startTime,
        endTime: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startMs),
        requestsCount: 2,
        successesCount: 2,
        errorsCount: 0,
        newRecordsCount: previewRes.newCount,
        updatedRecordsCount: previewRes.updatedCount,
        skippedRecordsCount: 0,
        errorMessages: [],
        status: 'COMPLETED',
      });

      return {
        success: true,
        streamer: mappedStreamer,
        snapshot: mappedSnapshot,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.logger.recordExecution({
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        type: 'INDIVIDUAL',
        streamerTarget: username,
        source: 'KICK Public API',
        startTime,
        endTime: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startMs),
        requestsCount: 1,
        successesCount: 0,
        errorsCount: 1,
        newRecordsCount: 0,
        updatedRecordsCount: 0,
        skippedRecordsCount: 1,
        errorMessages: [errMsg],
        status: 'FAILED',
      });
      return { success: false, streamer: null, snapshot: null, error: errMsg };
    }
  }

  /**
   * Prepara previsualización de sincronización masiva a través de SyncQueue (Req 10, 16)
   */
  public async prepareSyncPreview(
    usernames: string[],
    onProgress?: (current: number, total: number, item: SyncProgressItem) => void,
    abortSignal?: AbortSignal
  ): Promise<{
    queueResults: SyncProgressItem[];
    preview: IngestionPreviewResult;
    errors: string[];
  }> {
    if (!this.isLoaded) await this.loadFromStorage();

    // 1. Ejecutar llamadas a través de la cola con espaciado
    const queueData = await this.syncQueue.processQueue(
      usernames,
      this.streamers,
      onProgress,
      abortSignal
    );

    // 2. Ejecutar SyncManager PREVIEW
    const preview = await syncManager.preview(
      queueData.streamers,
      queueData.snapshots,
      this.streamers,
      this.snapshots,
      {
        sourceType: 'KICK_PUBLIC',
        sourceName: 'KICK Public API',
        sourceUrl: 'https://api.kick.com/public/v1',
        isDemo: false,
      }
    );

    return {
      queueResults: queueData.results,
      preview,
      errors: queueData.errors,
    };
  }

  /**
   * Confirma y aplica los datos tras la previsualización (Req 16, 17)
   */
  public async commitSyncPreview(
    preview: IngestionPreviewResult,
    conflictResolutions: Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>,
    syncType: SyncType = 'MASSIVE'
  ): Promise<{
    streamersCount: number;
    snapshotsCount: number;
    updatedCount: number;
    newCount: number;
  }> {
    const startTime = new Date().toISOString();
    const startMs = performance.now();

    const commitRes = await syncManager.apply(
      preview,
      this.streamers,
      this.snapshots,
      conflictResolutions
    );

    this.streamers = commitRes.finalStreamers;
    this.snapshots = commitRes.finalSnapshots;
    this.lastSyncDate = new Date().toISOString();
    await this.saveToStorage();

    // Registrar en SyncLogger
    await this.logger.recordExecution({
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      type: syncType,
      source: 'KICK Public API',
      startTime,
      endTime: new Date().toISOString(),
      durationMs: Math.round(performance.now() - startMs),
      requestsCount: preview.totalRecords,
      successesCount: preview.newCount + preview.updatedCount + preview.unchangedCount,
      errorsCount: preview.errorCount,
      newRecordsCount: preview.newCount,
      updatedRecordsCount: preview.updatedCount,
      skippedRecordsCount: preview.unchangedCount,
      errorMessages: preview.errors,
      status: preview.errorCount > 0 ? 'PARTIAL' : 'COMPLETED',
    });

    return {
      streamersCount: this.streamers.length,
      snapshotsCount: this.snapshots.length,
      updatedCount: preview.updatedCount,
      newCount: preview.newCount,
    };
  }

  /**
   * Sincroniza categorías oficiales desde GET /public/v1/categories (Req 21)
   */
  public async syncCategories(): Promise<CategoryData[]> {
    try {
      const rawCategories = await this.client.getCategories(1, 50);
      if (rawCategories && rawCategories.length > 0) {
        const mapped = rawCategories.map((raw) => {
          const existing = this.categories.find((c) => c.id === String(raw.id) || c.name === raw.name);
          return KickCategoryMapper.mapToCategory(raw, existing);
        });
        this.categories = mapped;
        await this.saveToStorage();
      }
      return [...this.categories];
    } catch {
      return [...this.categories];
    }
  }

  public getSnapshotsCount(): number {
    return this.snapshots.length;
  }
}
