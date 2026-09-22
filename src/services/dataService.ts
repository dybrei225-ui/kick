import { KickDataProvider, ProviderType, DataProviderMetadata } from '../adapters/KickDataProvider';
import { MockKickDataProvider } from '../adapters/MockKickDataProvider';
import { ManualKickDataProvider } from '../adapters/ManualKickDataProvider';
import { RealKickDataProvider } from '../adapters/RealKickApiAdapter';
import {
  Streamer,
  ChannelSnapshot,
  CategoryData,
  RegionMetric,
  AlertRule,
  AuditLog,
  DataReport,
  QualityAuditReport,
  ImportValidationResult,
} from '../types';
import { calculateGrowth, calculateStreamerGrowthMetrics, StreamerGrowthMetrics } from '../utils/math';
import { dataEngine, DataEngine } from '../engine/DataEngine';
import { SystemAlert, GlobalDataStatus, GeneratedAnalyticalReport, ReportType, DataConnectionStatus, ImportJob, ChangeLogEntry, AuditActionLog, StorageStats } from '../types';
import { syncManager } from '../engine/SyncManager';
import { appStorage } from '../adapters/storage/StorageAdapter';
import { KickDataPolicy, kickDataPolicy } from '../engine/compliance/KickDataPolicy';
import { PublicationGuard, publicationGuard } from '../engine/compliance/PublicationGuard';
import { DataFreshnessManager, dataFreshnessManager } from '../engine/compliance/DataFreshnessManager';
import { DataExpirationWorker, dataExpirationWorker, ExpirationRunResult } from '../engine/compliance/DataExpirationWorker';
import { RequestBudgetManager, requestBudgetManager } from '../engine/compliance/RequestBudgetManager';
import { KickDiscoveryEngine, kickDiscoveryEngine } from '../engine/discovery/KickDiscoveryEngine';
import { ChannelRegistry, channelRegistry } from '../engine/discovery/ChannelRegistry';
import { CoverageManager, coverageManager } from '../engine/coverage/CoverageManager';
import { RegionalVerificationEngine, regionalVerificationEngine } from '../engine/discovery/RegionalVerification';
import { DiscoveryCandidate, MonitoredChannel, CoverageStats } from '../types';
import { AnalyticsEngine, analyticsEngine } from '../engine/analytics/AnalyticsEngine';
import { Phase7Verification } from '../engine/tests/Phase7Verification';

const ACTIVE_PROVIDER_STORAGE_KEY = 'kick_analytics_mx_active_provider_choice';

class DataService {
  private activeProvider: KickDataProvider;
  private mockProvider: MockKickDataProvider;
  private manualProvider: ManualKickDataProvider;
  private realProvider: RealKickDataProvider;
  private activeType: ProviderType = 'mock';
  private listeners: Set<() => void> = new Set();
  public readonly engine: DataEngine = dataEngine;

  constructor() {
    this.mockProvider = new MockKickDataProvider();
    this.manualProvider = new ManualKickDataProvider();
    this.realProvider = new RealKickDataProvider();


    // Default to mock (demo) or load saved choice
    let savedChoice: ProviderType = 'mock';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ACTIVE_PROVIDER_STORAGE_KEY);
      if (stored === 'mock' || stored === 'manual' || stored === 'real') {
        savedChoice = stored as ProviderType;
      }
    }
    this.activeType = savedChoice;
    this.activeProvider = this.getProviderInstance(savedChoice);
  }

  private getProviderInstance(type: ProviderType): KickDataProvider {
    switch (type) {
      case 'manual':
        return this.manualProvider;
      case 'real':
        return this.realProvider;
      case 'mock':
      default:
        return this.mockProvider;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  public refresh() {
    this.notifyListeners();
  }

  public getProviderMetadata(): DataProviderMetadata {
    return this.activeProvider.getMetadata();
  }

  public getActiveProviderType(): ProviderType {
    return this.activeType;
  }

  public getRealProvider(): RealKickDataProvider {
    return this.realProvider;
  }

  public getManualProvider(): ManualKickDataProvider {
    return this.manualProvider;
  }

  public getMockProvider(): MockKickDataProvider {
    return this.mockProvider;
  }

  public setProvider(type: ProviderType) {
    this.activeType = type;
    this.activeProvider = this.getProviderInstance(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_PROVIDER_STORAGE_KEY, type);
    }
    this.notifyListeners();
  }

  public async getStreamers(): Promise<Streamer[]> {
    return this.activeProvider.getStreamers();
  }

  public async getStreamer(username: string): Promise<Streamer | null> {
    return this.activeProvider.getStreamer(username);
  }

  public async getSnapshots(streamerId: string, period?: string): Promise<ChannelSnapshot[]> {
    return this.activeProvider.getSnapshots(streamerId, period);
  }

  public async saveSnapshot(snapshot: ChannelSnapshot): Promise<ChannelSnapshot> {
    const saved = await this.activeProvider.saveSnapshot(snapshot);
    this.notifyListeners();
    return saved;
  }

  public async deleteSnapshot(id: string): Promise<boolean> {
    const deleted = await this.activeProvider.deleteSnapshot(id);
    if (deleted) this.notifyListeners();
    return deleted;
  }

  public async getCategories(): Promise<CategoryData[]> {
    return this.activeProvider.getCategories();
  }

  public async getRegionalPresence(): Promise<RegionMetric[]> {
    return this.activeProvider.getRegionalPresence();
  }

  public async getRegions(): Promise<RegionMetric[]> {
    return this.activeProvider.getRegionalPresence();
  }

  public isDemo(): boolean {
    return this.activeProvider.getMetadata().isDemoMode;
  }

  public async getAlerts(): Promise<AlertRule[]> {
    return this.activeProvider.getAlerts();
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.activeProvider.getAuditLogs();
  }

  public async saveStreamer(streamer: Partial<Streamer>): Promise<Streamer> {
    const saved = await this.activeProvider.saveStreamer(streamer);
    this.notifyListeners();
    return saved;
  }

  public async deleteStreamer(id: string): Promise<boolean> {
    const success = await this.activeProvider.deleteStreamer(id);
    if (success) {
      this.notifyListeners();
    }
    return success;
  }

  public async runQualityAudit(): Promise<QualityAuditReport> {
    const streamers = await this.getStreamers();
    const allSnapshots: ChannelSnapshot[] = [];
    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnapshots.push(...snaps);
    }
    return this.engine.runFullQualityAudit(streamers, allSnapshots);
  }

  /**
   * Scans and returns all system alerts across the ecosystem
   */
  public async getSystemAlerts(): Promise<SystemAlert[]> {
    const streamers = await this.getStreamers();
    const snapshotsMap = new Map<string, ChannelSnapshot[]>();

    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      snapshotsMap.set(s.id, snaps);
    }

    return this.engine.anomalyDetector.scanEcosystemAnomalies(streamers, (id) => {
      return snapshotsMap.get(id) || [];
    });
  }

  /**
   * Returns evaluated global data status
   */
  public async getGlobalDataStatus(): Promise<{
    status: GlobalDataStatus;
    label: string;
    details: string;
    badgeColor: string;
    composition: { real: number; manual: number; demo: number };
  }> {
    const streamers = await this.getStreamers();
    return this.engine.evaluateGlobalDataStatus(streamers, this.isDemo());
  }

  /**
   * Export Streamers in CSV format
   */
  public async exportStreamersCsv(): Promise<string> {
    const streamers = await this.getStreamers();
    return this.engine.reportEngine.exportStreamersCsv(streamers);
  }

  /**
   * Export Snapshots in CSV format
   */
  public async exportSnapshotsCsv(): Promise<string> {
    const streamers = await this.getStreamers();
    const allSnaps: ChannelSnapshot[] = [];
    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnaps.push(...snaps);
    }
    return this.engine.reportEngine.exportSnapshotsCsv(allSnaps);
  }

  /**
   * Generates full system backup JSON
   */
  public async generateFullBackup(): Promise<string> {
    const streamers = await this.getStreamers();
    const categories = await this.getCategories();
    const allSnaps: ChannelSnapshot[] = [];
    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnaps.push(...snaps);
    }
    return this.engine.generateFullBackupJson(streamers, allSnaps, categories);
  }

  /**
   * Generates analytical report
   */
  public async generateAnalyticalReport(
    reportType: ReportType,
    params: {
      targetUsername?: string;
      targetCategory?: string;
      periodLabel?: string;
    }
  ): Promise<GeneratedAnalyticalReport> {
    const streamers = await this.getStreamers();
    const categories = await this.getCategories();
    const auditReport = await this.runQualityAudit();
    const allSnaps: ChannelSnapshot[] = [];
    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnaps.push(...snaps);
    }

    return this.engine.reportEngine.generateReport(reportType, {
      streamers,
      categories,
      snapshots: allSnaps,
      auditReport,
      targetUsername: params.targetUsername,
      targetCategory: params.targetCategory,
      periodLabel: params.periodLabel,
    });
  }

  /**
   * Two-step JSON validation for Requirement 11 & 27
   * Validates structure, fields, duplicate usernames, negative values, and incomplete records.
   */
  public async validateImportPayload(rawInput: string): Promise<ImportValidationResult> {
    const existingStreamers = await this.getStreamers();
    const allSnaps: ChannelSnapshot[] = [];
    for (const s of existingStreamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnaps.push(...snaps);
    }
    return this.engine.parseAndValidateImport(rawInput, existingStreamers, allSnaps);
  }

  public validateJsonImport(jsonString: string): ImportValidationResult {

    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(jsonString);
    } catch (err: any) {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: [`El archivo no contiene un JSON sintácticamente válido: ${err?.message || 'Error de parseo'}`],
        warnings: [],
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        validCount: 0,
        modifiedCount: 0,
        newCount: 0,
        errorCount: 1,
        errors: ['El archivo no contiene un objeto o arreglo raíz válido.'],
        warnings: [],
      };
    }

    // Determine payload format: array of streamers or full backup object
    let incomingStreamers: any[] = [];
    let incomingSnapshots: any[] = [];

    if (Array.isArray(parsed)) {
      incomingStreamers = parsed;
    } else if (Array.isArray(parsed.streamers)) {
      incomingStreamers = parsed.streamers;
      if (Array.isArray(parsed.snapshots)) {
        incomingSnapshots = parsed.snapshots;
      }
    } else {
      errors.push('No se encontró un arreglo de streamers ni una lista de canales válida.');
    }

    const seenUsernames = new Set<string>();
    let validCount = 0;
    let modifiedCount = 0;
    let newCount = 0;

    for (let i = 0; i < incomingStreamers.length; i++) {
      const item = incomingStreamers[i];
      const indexStr = `Registro #${i + 1}`;

      if (!item || typeof item !== 'object') {
        errors.push(`${indexStr}: Registro corrupto (no es objeto).`);
        continue;
      }

      if (!item.username || typeof item.username !== 'string') {
        errors.push(`${indexStr}: Falta el campo obligatorio 'username'.`);
        continue;
      }

      const cleanUser = item.username.toLowerCase().trim().replace(/^@/, '');
      if (cleanUser.length < 2) {
        errors.push(`${indexStr}: El username "@${cleanUser}" es demasiado corto.`);
        continue;
      }

      if (seenUsernames.has(cleanUser)) {
        warnings.push(`${indexStr}: Usuario "@${cleanUser}" repetido dentro del mismo archivo.`);
      } else {
        seenUsernames.add(cleanUser);
      }

      // Check numbers
      const followersVal = item.followers?.value ?? (typeof item.followers === 'number' ? item.followers : null);
      const hoursVal = item.hoursStreamed?.value ?? (typeof item.hoursStreamed === 'number' ? item.hoursStreamed : null);
      const avgVal = item.avgViewers?.value ?? (typeof item.avgViewers === 'number' ? item.avgViewers : null);
      const peakVal = item.peakViewers?.value ?? (typeof item.peakViewers === 'number' ? item.peakViewers : null);

      if (followersVal !== null && followersVal < 0) {
        errors.push(`${indexStr} (@${cleanUser}): Los seguidores no pueden ser negativos (${followersVal}).`);
      }
      if (hoursVal !== null && hoursVal < 0) {
        errors.push(`${indexStr} (@${cleanUser}): Las horas no pueden ser negativas (${hoursVal}).`);
      }
      if (avgVal !== null && peakVal !== null && avgVal > peakVal) {
        warnings.push(
          `${indexStr} (@${cleanUser}): El promedio (${avgVal}) supera el pico (${peakVal}). Se recomienda revisar.`
        );
      }

      validCount++;
    }

    const isValid = errors.length === 0 && validCount > 0;

    return {
      valid: isValid,
      validCount,
      modifiedCount,
      newCount,
      errorCount: errors.length,
      errors,
      warnings,
      parsedPayload: {
        streamers: incomingStreamers,
        snapshots: incomingSnapshots,
        categories: parsed.categories,
      },
    };
  }

  /**
   * Applies pre-validated JSON payload safely to the active provider
   */
  public async applyValidatedImport(validationResult: ImportValidationResult): Promise<{ count: number; errors: string[] }> {
    if (!validationResult.parsedPayload) {
      return { count: 0, errors: ['No hay datos validados para aplicar.'] };
    }

    const result = await this.activeProvider.importManualData(validationResult.parsedPayload);
    this.notifyListeners();
    return { count: result.count, errors: result.errors };
  }

  public async importManualData(data: unknown): Promise<{ success: boolean; count: number; errors: string[] }> {
    const result = await this.activeProvider.importManualData(data);
    if (result.success) {
      this.notifyListeners();
    }
    return result;
  }

  public async exportData(): Promise<string> {
    return this.activeProvider.exportData();
  }

  public async resetAllData(): Promise<void> {
    await this.activeProvider.resetToDemo();
    this.notifyListeners();
  }

  /**
   * Calculates platform aggregates for Dashboard with support for period selection
   */
  public async getPlatformAggregates(timeframe: '7d' | '30d' | '90d' | '6m' | '1a' | 'historico' = '30d') {
    const streamers = await this.getStreamers();
    const activeStreamers = streamers.filter((s) => s.status === 'active');
    const registeredCount = streamers.length;
    const activeCount = activeStreamers.length;

    let totalFollowers = 0;
    let totalAvgViewers = 0;
    let avgViewersCount = 0;
    let totalHours = 0;
    let peakPlatformAudience = 0;
    let recentActiveCount = 0;
    let staleCount = 0;

    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const s of streamers) {
      if (s.followers.value) totalFollowers += s.followers.value;
      if (s.avgViewers.value) {
        totalAvgViewers += s.avgViewers.value;
        avgViewersCount++;
      }
      if (s.hoursStreamed.value) totalHours += s.hoursStreamed.value;
      if (s.peakViewers.value && s.peakViewers.value > peakPlatformAudience) {
        peakPlatformAudience = s.peakViewers.value;
      }

      if (s.lastStreamDate) {
        const last = new Date(s.lastStreamDate).getTime();
        if (last >= sevenDaysAgo) recentActiveCount++;
        if (last < sixtyDaysAgo) staleCount++;
      } else {
        staleCount++;
      }
    }

    const platformAvgViewers = avgViewersCount > 0 ? Math.round(totalAvgViewers / avgViewersCount) : 0;
    const newChannelsCount = streamers.filter((s) => {
      const created = new Date(s.createdAt).getTime();
      return created >= thirtyDaysAgo;
    }).length;

    const categories = await this.getCategories();

    return {
      registeredCount,
      activeCount,
      totalFollowers,
      platformAvgViewers,
      totalHours: Math.round(totalHours),
      peakPlatformAudience,
      newChannelsCount,
      recentActiveCount,
      staleCount,
      categoriesCount: categories.length,
      timeframe,
      updateDate: '20 de septiembre de 2026',
    };
  }

  /**
   * Objectively ranks emergent channels based on measurable mathematical metrics.
   * Strictly avoids subjective awards or unmeasurable labels (Requirement 6).
   */
  public async getEmergentRankings(
    criterion: 'followers_growth' | 'viewers_growth' | 'hours_streamed' | 'avg_viewers' | 'streams_growth',
    period: '7d' | '30d' | '90d' = '30d'
  ) {
    const streamers = await this.getStreamers();
    const ranked = [];

    for (const s of streamers) {
      const snapshots = await this.getSnapshots(s.id);
      // Pick past snapshot according to period
      const prevSnap =
        snapshots.find((snap) => snap.period.includes(period) || snap.date.includes('2026-08')) ||
        snapshots[snapshots.length - 1];

      const growthMetrics: StreamerGrowthMetrics = calculateStreamerGrowthMetrics(
        s,
        prevSnap ? {
          followers: prevSnap.followers,
          avgViewers: prevSnap.avgViewers,
          hoursStreamed: prevSnap.hoursStreamed,
          streamCount: prevSnap.streamCount ?? null,
        } : null,
        `Últimos ${period}`
      );

      ranked.push({
        streamer: s,
        followerGrowth: growthMetrics.growthFollowers,
        viewerGrowth: growthMetrics.growthAverageViewers,
        hoursGrowth: growthMetrics.growthHours,
        streamsGrowth: growthMetrics.growthStreams,
        hours: s.hoursStreamed.value || 0,
        avgViewers: s.avgViewers.value || 0,
        peakViewers: s.peakViewers.value || 0,
      });
    }

    if (criterion === 'followers_growth') {
      ranked.sort((a, b) => (b.followerGrowth.percentageChange || 0) - (a.followerGrowth.percentageChange || 0));
    } else if (criterion === 'viewers_growth') {
      ranked.sort((a, b) => (b.viewerGrowth.percentageChange || 0) - (a.viewerGrowth.percentageChange || 0));
    } else if (criterion === 'hours_streamed') {
      ranked.sort((a, b) => b.hours - a.hours);
    } else if (criterion === 'avg_viewers') {
      ranked.sort((a, b) => b.avgViewers - a.avgViewers);
    } else if (criterion === 'streams_growth') {
      ranked.sort((a, b) => (b.streamsGrowth.percentageChange || 0) - (a.streamsGrowth.percentageChange || 0));
    }

    return ranked;
  }

  /**
   * Generates formal data report
   */
  public async generateReport(): Promise<DataReport> {
    const aggregates = await this.getPlatformAggregates('30d');
    const categories = await this.getCategories();
    const emergent = await this.getEmergentRankings('followers_growth', '30d');

    const totalCategoryChannels = categories.reduce((sum, c) => sum + c.channelCount, 0);
    const topCategories = categories
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        share: totalCategoryChannels > 0 ? Math.round((c.channelCount / totalCategoryChannels) * 100) : 0,
      }));

    return {
      id: `rep-${Date.now()}`,
      title: 'KICK México — Informe de Actividad y Audiencia',
      generatedDate: '20 de septiembre de 2026',
      period: 'Periodo de observación: Agosto — Septiembre 2026',
      channelsAnalyzed: aggregates.registeredCount,
      totalFollowers: aggregates.totalFollowers,
      avgViewers: aggregates.platformAvgViewers,
      totalHoursStreamed: aggregates.totalHours,
      peakPlatformAudience: aggregates.peakPlatformAudience,
      topCategories,
      emergentChannels: emergent.slice(0, 3).map((item) => ({
        username: item.streamer.username,
        displayName: item.streamer.displayName,
        growthMetric: `Seguidores: ${item.followerGrowth.displayText} | Audiencia: ${item.viewerGrowth.displayText}`,
      })),
      methodologicalNotes: [
        'Las métricas se calculan a partir de registros públicos observados (contadores de canal y VODs disponibles).',
        'Los canales sin actividad registrada en más de 60 días se clasifican como Inactivos.',
        'La ubicación geográfica se incluye únicamente cuando el canal la ha confirmado públicamente en sus perfiles oficiales.',
        'Los datos marcados como DEMOSTRACIÓN representan muestras estructuradas para validar la plataforma sin simular falsas conexiones a APIs cerradas.',
      ],
      sources: [
        'KICK Perfiles Públicos Oficiales',
        'KICK Registros de VODs y Transmisiones en Vivo',
        'KICK ANALYTICS MX Registro Verificado',
      ],
    };
  }

  // --- FASE 4: MÉTODOS DE INGESTIÓN, ESTADO Y ROLLBACK ---

  public get sync(): typeof syncManager {
    return syncManager;
  }

  public get storage(): typeof appStorage {
    return appStorage;
  }

  /**
   * Requirement 36: DATA_CONNECTION_STATUS
   * Valores: NO_SOURCE | MANUAL | IMPORT | CONNECTED | ERROR
   */
  public async getDataConnectionStatus(): Promise<DataConnectionStatus> {
    if (this.activeType === 'real') {
      return 'NO_SOURCE'; // Real connector is pending / not configured
    }
    const streamers = await this.getStreamers();
    if (!streamers || streamers.length === 0) {
      return 'NO_SOURCE';
    }
    const jobs = await syncManager.getImportJobs();
    if (jobs.length > 0 && jobs.some((j) => j.status === 'COMPLETED')) {
      return 'IMPORT';
    }
    if (this.activeType === 'manual' || streamers.some((s) => !s.isDemo)) {
      return 'MANUAL';
    }
    return 'NO_SOURCE';
  }

  public async getAllSnapshots(): Promise<ChannelSnapshot[]> {
    const streamers = await this.getStreamers();
    const allSnaps: ChannelSnapshot[] = [];
    for (const s of streamers) {
      const snaps = await this.getSnapshots(s.id);
      allSnaps.push(...snaps);
    }
    return allSnaps;
  }

  /**
   * Actualización masiva atómica
   */
  public async batchApplyIngestion(
    streamers: Streamer[],
    snapshots: ChannelSnapshot[]
  ): Promise<void> {
    // Si estamos en modo manual o mock, guardar en el proveedor activo
    for (const s of streamers) {
      await this.activeProvider.saveStreamer(s);
    }
    for (const snap of snapshots) {
      await this.activeProvider.saveSnapshot(snap);
    }
    this.notifyListeners();
  }

  /**
   * Ejecuta rollback restaurando el estado anterior
   */
  public async rollbackJob(job: ImportJob): Promise<{ success: boolean; message: string }> {
    const currentStreamers = await this.getStreamers();
    const currentSnapshots = await this.getAllSnapshots();

    const res = await syncManager.rollback(job, currentStreamers, currentSnapshots);
    if (res.success) {
      // Reemplazar los datos del proveedor con el estado restaurado
      if (this.activeType === 'manual' || this.activeType === 'mock') {
        const manualProv = this.manualProvider;
        // Restaurar estado
        for (const s of res.restoredStreamers) {
          await manualProv.saveStreamer(s);
        }
        for (const sn of res.restoredSnapshots) {
          await manualProv.saveSnapshot(sn);
        }
      }
      this.notifyListeners();
    }
    return { success: res.success, message: res.message };
  }

  // ==========================================
  // FASE 6 — COMPLIANCE & COVERAGE ACCESSORS
  // ==========================================

  public getKickDataPolicy(): KickDataPolicy {
    return kickDataPolicy;
  }

  public getPublicationGuard(): PublicationGuard {
    return publicationGuard;
  }

  public getDataFreshnessManager(): DataFreshnessManager {
    return dataFreshnessManager;
  }

  public getDataExpirationWorker(): DataExpirationWorker {
    return dataExpirationWorker;
  }

  public getRequestBudgetManager(): RequestBudgetManager {
    return requestBudgetManager;
  }

  public getKickDiscoveryEngine(): KickDiscoveryEngine {
    return kickDiscoveryEngine;
  }

  public getChannelRegistry(): ChannelRegistry {
    return channelRegistry;
  }

  public getCoverageManager(): CoverageManager {
    return coverageManager;
  }

  public getRegionalVerificationEngine(): RegionalVerificationEngine {
    return regionalVerificationEngine;
  }

  public get analytics(): AnalyticsEngine {
    return analyticsEngine;
  }

  public runPhase7Verification() {
    return Phase7Verification.runAllTests();
  }

  /**
   * Ejecuta la purga de datos de API expirados (> 24h) y actualiza el estado de la app
   */
  public async purgeExpiredApiData(): Promise<ExpirationRunResult> {
    const streamers = await this.getStreamers();
    const snapshots = await this.getAllSnapshots();
    const { result } = await dataExpirationWorker.purgeExpiredData(streamers, snapshots);
    this.notifyListeners();
    return result;
  }

  /**
   * Calcula el estado de cobertura actual combinando el catálogo y candidatos
   */
  public async getCoverageStats(): Promise<CoverageStats> {
    const streamers = await this.getStreamers();
    const candidates = await channelRegistry.getCandidates();
    return coverageManager.calculateCoverageStats(streamers, candidates);
  }
}

export const dataService = new DataService();
