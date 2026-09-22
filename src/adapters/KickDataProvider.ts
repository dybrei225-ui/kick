import { Streamer, ChannelSnapshot, CategoryData, RegionMetric, AlertRule, AuditLog, QualityAuditReport } from '../types';

export type ProviderType = 'mock' | 'manual' | 'real';

export interface DataProviderMetadata {
  providerName: string;
  providerType: ProviderType;
  isDemoMode: boolean;
  status: 'active' | 'pending_connector' | 'simulated_disabled' | 'manual';
  statusDescription: string;
  lastSyncDate: string;
  connectorNotice?: string;
}

export interface KickDataProvider {
  getMetadata(): DataProviderMetadata;
  getStreamers(): Promise<Streamer[]>;
  getStreamer(username: string): Promise<Streamer | null>;
  getSnapshots(streamerId: string, period?: string): Promise<ChannelSnapshot[]>;
  saveSnapshot(snapshot: ChannelSnapshot): Promise<ChannelSnapshot>;
  deleteSnapshot(id: string): Promise<boolean>;
  getCategories(): Promise<CategoryData[]>;
  getRegionalPresence(): Promise<RegionMetric[]>;
  getAlerts(): Promise<AlertRule[]>;
  getAuditLogs(): Promise<AuditLog[]>;
  saveStreamer(streamer: Partial<Streamer>): Promise<Streamer>;
  deleteStreamer(id: string): Promise<boolean>;
  importManualData(data: unknown): Promise<{ success: boolean; count: number; errors: string[] }>;
  exportData(): Promise<string>;
  resetToDemo(): Promise<void>;
  runQualityAudit(): Promise<QualityAuditReport>;
}
