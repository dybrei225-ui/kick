import { KickDataProvider, DataProviderMetadata } from './KickDataProvider';
import { Streamer, ChannelSnapshot, CategoryData, RegionMetric, AlertRule, AuditLog, QualityAuditReport, QualityIssue } from '../types';
import { SEED_CATEGORIES, REGIONS_DATA } from '../data/seedData';
import { appStorage } from './storage/StorageAdapter';

const MANUAL_STORAGE_KEY = 'kick_analytics_mx_manual_provider_v1';

export class ManualKickDataProvider implements KickDataProvider {
  private streamers: Streamer[] = [];
  private snapshots: ChannelSnapshot[] = [];
  private categories: CategoryData[] = [...SEED_CATEGORIES];
  private regions: RegionMetric[] = [...REGIONS_DATA];
  private alerts: AlertRule[] = [];
  private logs: AuditLog[] = [];
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      // Intentar leer de forma asíncrona mediante el StorageAdapter
      appStorage.getAdapter().getItem(MANUAL_STORAGE_KEY).then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.streamers)) this.streamers = parsed.streamers;
            if (Array.isArray(parsed.snapshots)) this.snapshots = parsed.snapshots;
            if (Array.isArray(parsed.categories)) this.categories = parsed.categories;
            if (Array.isArray(parsed.regions)) this.regions = parsed.regions;
            if (Array.isArray(parsed.logs)) this.logs = parsed.logs;
          } catch {}
        }
      });
      // Respaldo síncrono inmediato si está en localStorage para evitar pantalla en blanco en primer tick
      const storedSync = window.localStorage?.getItem(MANUAL_STORAGE_KEY);
      if (storedSync) {
        const parsed = JSON.parse(storedSync);
        if (Array.isArray(parsed.streamers)) this.streamers = parsed.streamers;
        if (Array.isArray(parsed.snapshots)) this.snapshots = parsed.snapshots;
        if (Array.isArray(parsed.categories)) this.categories = parsed.categories;
        if (Array.isArray(parsed.regions)) this.regions = parsed.regions;
        if (Array.isArray(parsed.logs)) this.logs = parsed.logs;
      }
      this.isLoaded = true;
    } catch {
      this.streamers = [];
      this.snapshots = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        streamers: this.streamers,
        snapshots: this.snapshots,
        categories: this.categories,
        regions: this.regions,
        logs: this.logs,
        savedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(payload);
      // Persistir mediante StorageAdapter
      appStorage.getAdapter().setItem(MANUAL_STORAGE_KEY, serialized);
    } catch {
      // Storage quota or unavailable
    }
  }

  getMetadata(): DataProviderMetadata {
    return {
      providerName: 'ManualKickDataProvider (Base de Datos Manual)',
      providerType: 'manual',
      isDemoMode: false,
      status: 'manual',
      statusDescription:
        'Datos verificados manualmente introducidos por el operador en el panel /admin o importados desde JSON.',
      lastSyncDate: this.streamers.length > 0 ? this.streamers[0]?.verificationDate || 'Hoy' : 'Sin datos',
      connectorNotice: 'Modo manual activo. Las estadísticas provienen de auditorías públicas registradas manualmente.',
    };
  }

  async getStreamers(): Promise<Streamer[]> {
    this.loadFromStorage();
    return [...this.streamers];
  }

  async getStreamer(username: string): Promise<Streamer | null> {
    this.loadFromStorage();
    const clean = username.toLowerCase().trim().replace(/^@/, '');
    const found = this.streamers.find((s) => s.username.toLowerCase() === clean);
    return found ? { ...found } : null;
  }

  async getSnapshots(streamerId: string, period?: string): Promise<ChannelSnapshot[]> {
    this.loadFromStorage();
    let list = this.snapshots.filter((s) => s.streamerId === streamerId);
    if (period && period !== 'historico') {
      const now = new Date();
      const cutoff = new Date();
      if (period === '7d') cutoff.setDate(now.getDate() - 7);
      else if (period === '30d') cutoff.setDate(now.getDate() - 30);
      else if (period === '90d') cutoff.setDate(now.getDate() - 90);
      else if (period === '6m') cutoff.setMonth(now.getMonth() - 6);
      else if (period === '1a') cutoff.setFullYear(now.getFullYear() - 1);

      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((s) => s.date >= cutoffStr);
    }
    // Sort chronological
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveSnapshot(snapshot: ChannelSnapshot): Promise<ChannelSnapshot> {
    this.loadFromStorage();
    const existingIndex = this.snapshots.findIndex((s) => s.id === snapshot.id);
    const snap: ChannelSnapshot = {
      ...snapshot,
      dataType: snapshot.dataType || 'manual',
      isDemo: false,
      confidence: snapshot.confidence || 'alta',
      capturedAt: snapshot.capturedAt || snapshot.date,
    };

    if (existingIndex >= 0) {
      this.snapshots[existingIndex] = snap;
    } else {
      this.snapshots.push(snap);
    }
    this.saveToStorage();
    return snap;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    this.loadFromStorage();
    const initialLen = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    if (this.snapshots.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  async getCategories(): Promise<CategoryData[]> {
    this.loadFromStorage();
    return [...this.categories];
  }

  async getRegionalPresence(): Promise<RegionMetric[]> {
    this.loadFromStorage();
    return [...this.regions];
  }

  async getAlerts(): Promise<AlertRule[]> {
    return [...this.alerts];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    this.loadFromStorage();
    return [...this.logs];
  }

  async saveStreamer(streamerData: Partial<Streamer>): Promise<Streamer> {
    this.loadFromStorage();
    const now = new Date().toISOString();
    const cleanUsername = (streamerData.username || '').toLowerCase().trim().replace(/^@/, '');
    const existingIndex = this.streamers.findIndex(
      (s) => s.id === streamerData.id || s.username.toLowerCase() === cleanUsername
    );

    const streamerId = streamerData.id || `str-manual-${cleanUsername || Date.now()}`;

    // Auto-create snapshot for this update (Requirement 4)
    const todayDate = now.split('T')[0];
    const newSnapshot: ChannelSnapshot = {
      id: `snap-${streamerId}-${Date.now()}`,
      streamerId,
      date: todayDate,
      period: 'Actualización Manual Registrada',
      followers: streamerData.followers?.value ?? null,
      avgViewers: streamerData.avgViewers?.value ?? null,
      peakViewers: streamerData.peakViewers?.value ?? null,
      hoursStreamed: streamerData.hoursStreamed?.value ?? null,
      streamCount: streamerData.streamCount?.value ?? null,
      category: streamerData.primaryCategory || 'Otros',
      source: streamerData.source || streamerData.followers?.source || 'Auditoría Manual /admin',
      verificationDate: streamerData.verificationDate || todayDate,
      dataType: 'manual',
      capturedAt: todayDate,
      confidence: streamerData.confidence || 'alta',
      isDemo: false,
    };

    // Save snapshot without overwriting older history
    this.snapshots.push(newSnapshot);

    const baseStreamer: Streamer = {
      id: streamerId,
      username: cleanUsername,
      displayName: streamerData.displayName || cleanUsername,
      publicName: streamerData.publicName ?? null,
      avatarUrl:
        streamerData.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: streamerData.bio ?? null,
      kickUrl: `https://kick.com/${cleanUsername}`,
      status: streamerData.status || 'active',
      country: streamerData.country || 'México',
      city: streamerData.city ?? null,
      state: streamerData.state ?? null,
      organization: streamerData.organization ?? null,
      socialLinks: streamerData.socialLinks || [],
      primaryCategory: streamerData.primaryCategory || 'Otros',
      categories: streamerData.categories || [streamerData.primaryCategory || 'Otros'],
      followers: streamerData.followers || {
        value: null,
        capturedAt: todayDate,
        captureDate: todayDate,
        period: 'Tiempo real observado',
        source: streamerData.source || 'Manual',
        dataType: 'not_available',
        confidence: 'media',
        isDemo: false,
      },
      avgViewers: streamerData.avgViewers || {
        value: null,
        capturedAt: todayDate,
        captureDate: todayDate,
        period: 'Últimos 30 días',
        source: streamerData.source || 'Manual',
        dataType: 'not_available',
        confidence: 'media',
        isDemo: false,
      },
      peakViewers: streamerData.peakViewers || {
        value: null,
        capturedAt: todayDate,
        captureDate: todayDate,
        period: 'Últimos 30 días',
        source: streamerData.source || 'Manual',
        dataType: 'not_available',
        confidence: 'media',
        isDemo: false,
      },
      hoursStreamed: streamerData.hoursStreamed || {
        value: null,
        capturedAt: todayDate,
        captureDate: todayDate,
        period: 'Últimos 30 días',
        source: streamerData.source || 'Manual',
        dataType: 'not_available',
        confidence: 'media',
        isDemo: false,
      },
      streamCount: streamerData.streamCount || {
        value: null,
        capturedAt: todayDate,
        captureDate: todayDate,
        period: 'Últimos 30 días',
        source: streamerData.source || 'Manual',
        dataType: 'not_available',
        confidence: 'media',
        isDemo: false,
      },
      lastStreamDate: streamerData.lastStreamDate || todayDate,
      isDemo: false,
      dataType: 'manual',
      confidence: streamerData.confidence || 'alta',
      capturedAt: todayDate,
      createdAt: streamerData.createdAt || now,
      updatedAt: now,
      verificationDate: streamerData.verificationDate || todayDate,
      source: streamerData.source || 'Auditoría Manual /admin',
    };

    if (existingIndex >= 0) {
      this.streamers[existingIndex] = {
        ...this.streamers[existingIndex],
        ...baseStreamer,
        updatedAt: now,
      };
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        action: 'UPDATE_MANUAL_STREAMER',
        target: cleanUsername,
        details: `Actualización y creación de snapshot para @${cleanUsername}`,
        operator: 'ADMIN_MANUAL',
      });
    } else {
      this.streamers.push(baseStreamer);
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        action: 'CREATE_MANUAL_STREAMER',
        target: cleanUsername,
        details: `Nuevo canal registrado manualmente: @${cleanUsername}`,
        operator: 'ADMIN_MANUAL',
      });
    }

    this.saveToStorage();
    return baseStreamer;
  }

  async deleteStreamer(id: string): Promise<boolean> {
    this.loadFromStorage();
    const initialLen = this.streamers.length;
    const toDelete = this.streamers.find((s) => s.id === id);
    this.streamers = this.streamers.filter((s) => s.id !== id);
    this.snapshots = this.snapshots.filter((s) => s.streamerId !== id);

    if (this.streamers.length !== initialLen) {
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'DELETE_STREAMER',
        target: toDelete?.username || id,
        details: `Canal e históricos eliminados de la base manual`,
        operator: 'ADMIN_MANUAL',
      });
      this.saveToStorage();
      return true;
    }
    return false;
  }

  async importManualData(data: unknown): Promise<{ success: boolean; count: number; errors: string[] }> {
    this.loadFromStorage();
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, errors: ['El archivo no contiene un objeto JSON estructurado válido.'] };
    }

    const payload = data as {
      streamers?: Streamer[];
      snapshots?: ChannelSnapshot[];
      categories?: CategoryData[];
    };

    const errors: string[] = [];
    let count = 0;

    if (Array.isArray(payload.streamers)) {
      for (const s of payload.streamers) {
        if (!s.username) {
          errors.push(`Canal sin @username omitido.`);
          continue;
        }
        const clean = s.username.toLowerCase().trim().replace(/^@/, '');
        const exists = this.streamers.findIndex((x) => x.username.toLowerCase() === clean);
        const item: Streamer = {
          ...s,
          username: clean,
          isDemo: false,
          dataType: 'manual',
          updatedAt: new Date().toISOString(),
        };
        if (exists >= 0) {
          this.streamers[exists] = item;
        } else {
          this.streamers.push(item);
        }
        count++;
      }
    }

    if (Array.isArray(payload.snapshots)) {
      for (const snap of payload.snapshots) {
        if (snap.streamerId && snap.date) {
          this.snapshots.push({
            ...snap,
            isDemo: false,
            dataType: snap.dataType || 'manual',
          });
        }
      }
    }

    this.saveToStorage();
    return { success: errors.length === 0 || count > 0, count, errors };
  }

  async exportData(): Promise<string> {
    this.loadFromStorage();
    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
        platform: 'KICK ANALYTICS MX',
        provider: 'ManualKickDataProvider',
      },
      streamers: this.streamers,
      snapshots: this.snapshots,
      categories: this.categories,
      regions: this.regions,
      sources: Array.from(new Set(this.streamers.map((s) => s.source).filter(Boolean))),
    };
    return JSON.stringify(payload, null, 2);
  }

  async resetToDemo(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MANUAL_STORAGE_KEY);
    }
    this.streamers = [];
    this.snapshots = [];
    this.saveToStorage();
  }

  async runQualityAudit(): Promise<QualityAuditReport> {
    this.loadFromStorage();
    const issues: QualityIssue[] = [];
    const usernames = new Set<string>();
    let withSourceCount = 0;
    let needsUpdateCount = 0;
    let noHistoryCount = 0;
    let incompleteCount = 0;
    let duplicatesCount = 0;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysStr = sixtyDaysAgo.toISOString().split('T')[0];

    for (const s of this.streamers) {
      // Username validity
      if (usernames.has(s.username.toLowerCase())) {
        duplicatesCount++;
        issues.push({
          type: 'error',
          category: 'duplicate',
          target: `@${s.username}`,
          message: `Nombre de usuario duplicado detectado: @${s.username}`,
        });
      } else {
        usernames.add(s.username.toLowerCase());
      }

      if (!/^[a-z0-9_]{2,25}$/i.test(s.username)) {
        issues.push({
          type: 'error',
          category: 'invalid',
          target: `@${s.username}`,
          message: `Formato de usuario no estándar para KICK: "${s.username}"`,
        });
      }

      // Source verification
      if (s.source && s.source.trim() !== '' && s.source !== 'N/D') {
        withSourceCount++;
      } else {
        issues.push({
          type: 'warning',
          category: 'missing',
          target: `@${s.username}`,
          message: `El canal @${s.username} no especifica fuente de verificación.`,
        });
      }

      // Stale data check
      const lastUpdate = s.verificationDate || s.lastStreamDate || '';
      if (!lastUpdate || lastUpdate < sixtyDaysStr) {
        needsUpdateCount++;
        issues.push({
          type: 'warning',
          category: 'stale',
          target: `@${s.username}`,
          message: `Métricas con más de 60 días sin verificar (última: ${lastUpdate || 'Desconocida'}).`,
        });
      }

      // Incomplete metrics
      if (
        s.followers.value === null &&
        s.avgViewers.value === null &&
        s.peakViewers.value === null &&
        s.hoursStreamed.value === null
      ) {
        incompleteCount++;
        issues.push({
          type: 'warning',
          category: 'missing',
          target: `@${s.username}`,
          message: `Canal sin ninguna métrica observada registrada.`,
        });
      }

      // Impossible stats
      if ((s.followers.value ?? 0) < 0 || (s.hoursStreamed.value ?? 0) < 0) {
        issues.push({
          type: 'error',
          category: 'impossible',
          target: `@${s.username}`,
          message: `Valores numéricos negativos imposibles en seguidores u horas.`,
        });
      }
      if (
        s.avgViewers.value !== null &&
        s.peakViewers.value !== null &&
        s.avgViewers.value > s.peakViewers.value
      ) {
        issues.push({
          type: 'error',
          category: 'impossible',
          target: `@${s.username}`,
          message: `Audiencia promedio (${s.avgViewers.value}) no puede superar al pico (${s.peakViewers.value}).`,
        });
      }

      // History check
      const streamerSnaps = this.snapshots.filter((snap) => snap.streamerId === s.id);
      if (streamerSnaps.length === 0) {
        noHistoryCount++;
        issues.push({
          type: 'warning',
          category: 'missing',
          target: `@${s.username}`,
          message: `Canal sin registros históricos de evolución (snapshots).`,
        });
      }
    }

    const validChannelsCount = this.streamers.length - duplicatesCount;

    return {
      totalChannels: this.streamers.length,
      validChannelsCount: Math.max(0, validChannelsCount),
      withSourceCount,
      needsUpdateCount,
      noHistoryCount,
      incompleteCount,
      duplicatesCount,
      issues,
      auditedAt: new Date().toISOString(),
    };
  }
}
