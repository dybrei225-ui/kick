import { KickDataProvider, DataProviderMetadata } from './KickDataProvider';
import { Streamer, ChannelSnapshot, CategoryData, RegionMetric, AlertRule, AuditLog, QualityAuditReport, QualityIssue } from '../types';
import { SEED_STREAMERS, SEED_SNAPSHOTS, SEED_CATEGORIES, REGIONS_DATA, SEED_ALERTS } from '../data/seedData';

export class MockKickDataProvider implements KickDataProvider {
  private streamers: Streamer[] = [...SEED_STREAMERS];
  private snapshots: ChannelSnapshot[] = [...SEED_SNAPSHOTS];
  private categories: CategoryData[] = [...SEED_CATEGORIES];
  private regions: RegionMetric[] = [...REGIONS_DATA];
  private alerts: AlertRule[] = [...SEED_ALERTS];
  private logs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: '2026-09-20T17:00:00Z',
      action: 'INIT_PROVIDER',
      target: 'SISTEMA',
      details: 'Proveedor de demostración inicializado con muestras etiquetadas.',
      operator: 'SYSTEM',
    },
  ];

  getMetadata(): DataProviderMetadata {
    return {
      providerName: 'MockKickDataProvider (Muestra de Demostración)',
      providerType: 'mock',
      isDemoMode: true,
      status: 'active',
      statusDescription: 'Datos de muestra para pruebas y diseño de interfaz. No son mediciones privadas.',
      lastSyncDate: '2026-09-20',
      connectorNotice: 'Modo demo activo. Registros etiquetados con [DEMO] con fines de validación.',
    };
  }

  async getStreamers(): Promise<Streamer[]> {
    return [...this.streamers];
  }

  async getStreamer(username: string): Promise<Streamer | null> {
    const normalized = username.toLowerCase().trim().replace(/^@/, '');
    const found = this.streamers.find((s) => s.username.toLowerCase() === normalized);
    return found ? { ...found } : null;
  }

  async getSnapshots(streamerId: string, period?: string): Promise<ChannelSnapshot[]> {
    let snaps = this.snapshots.filter((s) => s.streamerId === streamerId);
    if (period && period !== 'Histórico' && period !== 'historico') {
      const now = new Date();
      const cutoff = new Date();
      if (period === '7d') cutoff.setDate(now.getDate() - 7);
      else if (period === '30d') cutoff.setDate(now.getDate() - 30);
      else if (period === '90d') cutoff.setDate(now.getDate() - 90);
      else if (period === '6m') cutoff.setMonth(now.getMonth() - 6);
      else if (period === '1a') cutoff.setFullYear(now.getFullYear() - 1);

      const cutoffStr = cutoff.toISOString().split('T')[0];
      snaps = snaps.filter((s) => s.date >= cutoffStr);
    }
    return snaps.sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveSnapshot(snapshot: ChannelSnapshot): Promise<ChannelSnapshot> {
    const existingIndex = this.snapshots.findIndex((s) => s.id === snapshot.id);
    const snap: ChannelSnapshot = {
      ...snapshot,
      dataType: snapshot.dataType || 'demo',
      isDemo: true,
      confidence: snapshot.confidence || 'media',
      capturedAt: snapshot.capturedAt || snapshot.date,
    };
    if (existingIndex >= 0) {
      this.snapshots[existingIndex] = snap;
    } else {
      this.snapshots.push(snap);
    }
    return snap;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const initialLen = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    return this.snapshots.length !== initialLen;
  }

  async getCategories(): Promise<CategoryData[]> {
    return [...this.categories];
  }

  async getRegionalPresence(): Promise<RegionMetric[]> {
    return [...this.regions];
  }

  async getAlerts(): Promise<AlertRule[]> {
    return [...this.alerts];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return [...this.logs];
  }

  async saveStreamer(streamerData: Partial<Streamer>): Promise<Streamer> {
    const now = new Date().toISOString();
    const existingIndex = this.streamers.findIndex((s) => s.id === streamerData.id || s.username === streamerData.username);

    if (existingIndex >= 0) {
      const updated = {
        ...this.streamers[existingIndex],
        ...streamerData,
        updatedAt: now,
      } as Streamer;
      this.streamers[existingIndex] = updated;
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        action: 'UPDATE_STREAMER',
        target: updated.username,
        details: `Actualización de métricas/perfil para @${updated.username}`,
        operator: 'ADMIN',
      });
      return updated;
    } else {
      const newStreamer: Streamer = {
        id: streamerData.id || `str-${Date.now()}`,
        username: streamerData.username || 'canal_nuevo',
        displayName: streamerData.displayName || streamerData.username || 'Canal Nuevo',
        publicName: streamerData.publicName || null,
        avatarUrl: streamerData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: streamerData.bio || null,
        kickUrl: streamerData.kickUrl || `https://kick.com/${streamerData.username}`,
        status: streamerData.status || 'active',
        country: 'México',
        city: streamerData.city || null,
        state: streamerData.state || null,
        organization: streamerData.organization || null,
        socialLinks: streamerData.socialLinks || [],
        primaryCategory: streamerData.primaryCategory || 'Otros',
        categories: streamerData.categories || [streamerData.primaryCategory || 'Otros'],
        followers: streamerData.followers || {
          value: null,
          captureDate: '2026-09-20',
          period: 'Tiempo real observado',
          source: streamerData.source || 'Manual',
          dataType: 'not_available',
        },
        avgViewers: streamerData.avgViewers || {
          value: null,
          captureDate: '2026-09-20',
          period: 'Últimos 30 días',
          source: streamerData.source || 'Manual',
          dataType: 'not_available',
        },
        peakViewers: streamerData.peakViewers || {
          value: null,
          captureDate: '2026-09-20',
          period: 'Últimos 30 días',
          source: streamerData.source || 'Manual',
          dataType: 'not_available',
        },
        hoursStreamed: streamerData.hoursStreamed || {
          value: null,
          captureDate: '2026-09-20',
          period: 'Últimos 30 días',
          source: streamerData.source || 'Manual',
          dataType: 'not_available',
        },
        lastStreamDate: streamerData.lastStreamDate || null,
        isDemo: true,
        createdAt: now,
        updatedAt: now,
        verificationDate: streamerData.verificationDate || '2026-09-20',
        source: streamerData.source || 'KICK (Muestra Demostrativa)',
      };
      this.streamers.push(newStreamer);
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        action: 'CREATE_STREAMER',
        target: newStreamer.username,
        details: `Nuevo canal registrado manualmente @${newStreamer.username}`,
        operator: 'ADMIN',
      });
      return newStreamer;
    }
  }

  async deleteStreamer(id: string): Promise<boolean> {
    const streamer = this.streamers.find((s) => s.id === id);
    if (!streamer) return false;
    this.streamers = this.streamers.filter((s) => s.id !== id);
    this.logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DELETE_STREAMER',
      target: streamer.username,
      details: `Canal eliminado @${streamer.username}`,
      operator: 'ADMIN',
    });
    return true;
  }

  async importManualData(data: unknown): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
      data = [data];
    }

    if (!Array.isArray(data)) {
      return { success: false, count: 0, errors: ['El formato debe ser un objeto JSON o un array de objetos'] };
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i] as Record<string, unknown>;
      if (!item.username || typeof item.username !== 'string') {
        errors.push(`Registro #${i + 1}: 'username' es obligatorio.`);
        continue;
      }

      const followersNum = typeof item.followers === 'number' ? item.followers : null;
      const avgNum = typeof item.avgViewers === 'number' ? item.avgViewers : null;
      const peakNum = typeof item.peakViewers === 'number' ? item.peakViewers : null;
      const hoursNum = typeof item.hoursStreamed === 'number' ? item.hoursStreamed : null;
      const sourceStr = typeof item.source === 'string' ? item.source : 'KICK Registro Manual';
      const verDate = typeof item.verificationDate === 'string' ? item.verificationDate : '2026-09-20';

      await this.saveStreamer({
        username: (item.username as string).toLowerCase().trim(),
        displayName: (item.displayName as string) || (item.username as string),
        primaryCategory: (item.category as string) || 'Otros',
        country: (item.country as string) || 'México',
        source: sourceStr,
        verificationDate: verDate,
        followers: {
          value: followersNum,
          captureDate: verDate,
          period: 'Tiempo real observado',
          source: sourceStr,
          dataType: followersNum !== null ? 'observed_counter' : 'not_available',
        },
        avgViewers: {
          value: avgNum,
          captureDate: verDate,
          period: 'Últimos 30 días',
          source: sourceStr,
          dataType: avgNum !== null ? 'calculated_average' : 'not_available',
        },
        peakViewers: {
          value: peakNum,
          captureDate: verDate,
          period: 'Transmisión pico',
          source: sourceStr,
          dataType: peakNum !== null ? 'observed_peak' : 'not_available',
        },
        hoursStreamed: {
          value: hoursNum,
          captureDate: verDate,
          period: 'Últimos 30 días',
          source: sourceStr,
          dataType: hoursNum !== null ? 'accumulated_hours' : 'not_available',
        },
        lastStreamDate: typeof item.lastStream === 'string' ? item.lastStream : null,
        isDemo: false,
      });
      count++;
    }

    return {
      success: count > 0,
      count,
      errors,
    };
  }

  async exportData(): Promise<string> {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        provider: 'KICK ANALYTICS MX',
        streamers: this.streamers,
        snapshots: this.snapshots,
        categories: this.categories,
      },
      null,
      2
    );
  }

  async resetToDemo(): Promise<void> {
    this.streamers = [...SEED_STREAMERS];
    this.snapshots = [...SEED_SNAPSHOTS];
    this.categories = [...SEED_CATEGORIES];
    this.regions = [...REGIONS_DATA];
    this.alerts = [...SEED_ALERTS];
  }

  async runQualityAudit(): Promise<QualityAuditReport> {
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
      if (usernames.has(s.username.toLowerCase())) {
        duplicatesCount++;
        issues.push({
          type: 'error',
          category: 'duplicate',
          target: `@${s.username}`,
          message: `Usuario duplicado: @${s.username}`,
        });
      } else {
        usernames.add(s.username.toLowerCase());
      }

      if (s.source && s.source.trim() !== '' && s.source !== 'N/D') {
        withSourceCount++;
      } else {
        issues.push({
          type: 'warning',
          category: 'missing',
          target: `@${s.username}`,
          message: `Canal sin fuente verificada registrada`,
        });
      }

      const last = s.verificationDate || s.lastStreamDate || '';
      if (!last || last < sixtyDaysStr) {
        needsUpdateCount++;
        issues.push({
          type: 'warning',
          category: 'stale',
          target: `@${s.username}`,
          message: `Métricas desactualizadas (hace más de 60 días)`,
        });
      }

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
          message: `Canal con datos incompletos`,
        });
      }

      const snaps = this.snapshots.filter((snap) => snap.streamerId === s.id);
      if (snaps.length === 0) {
        noHistoryCount++;
        issues.push({
          type: 'warning',
          category: 'missing',
          target: `@${s.username}`,
          message: `Canal sin evolución histórica registrada`,
        });
      }
    }

    return {
      totalChannels: this.streamers.length,
      validChannelsCount: Math.max(0, this.streamers.length - duplicatesCount),
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
