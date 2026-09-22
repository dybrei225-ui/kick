export type StreamerStatus =
  | 'active'
  | 'low_activity'
  | 'inactive'
  | 'deleted'
  | 'suspended'
  | 'unverifiable';

export type DataOrigin = 'real' | 'manual' | 'demo';

export type ConfidenceLevel = 'alta' | 'media' | 'baja' | 'no_verificable' | 'high' | 'medium' | 'low';

export type MetricDataType =
  | 'observed_counter'
  | 'calculated_average'
  | 'observed_peak'
  | 'accumulated_hours'
  | 'not_available'
  | 'observed'
  | 'real'
  | 'manual'
  | 'manual_audit'
  | 'demo'
  | 'demo_generated';

export interface MetricWithMeta<T = number | null> {
  value: T;
  captureDate?: string;
  capturedAt?: string;
  lastUpdated?: string;
  period: string;
  source: string;
  dataType?: MetricDataType;
  type?: string;
  confidence?: ConfidenceLevel;
  isDemo?: boolean;
  notes?: string;
}

export interface ChannelAlert {
  id: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string;
  type: 'unusual_follower_surge' | 'peak_viewers_record' | 'returned_from_inactivity' | 'inactivity_threshold';
  title: string;
  description: string;
  date: string;
  requiresActiveConnector: boolean;
  isDemo: boolean;
  metadata?: Record<string, unknown>;
}

export interface SocialLink {
  platform: 'twitter' | 'instagram' | 'youtube' | 'tiktok' | 'discord' | 'facebook' | 'web';
  url: string;
  handle: string;
}

export interface Streamer {
  id: string;
  username: string; // e.g. "lonche"
  displayName: string; // e.g. "Lonche"
  publicName: string | null; // e.g. "Luis González" or null if not public
  avatarUrl: string;
  bio: string | null;
  kickUrl: string;
  status: StreamerStatus;
  country: string; // "México"
  city: string | null; // null if not confirmed publicly
  state: string | null; // e.g. "CDMX", "Jalisco", "Nuevo León", etc.
  organization: string | null;
  socialLinks: SocialLink[];
  primaryCategory: string;
  categories: string[];
  followers: MetricWithMeta<number | null>;
  avgViewers: MetricWithMeta<number | null>;
  peakViewers: MetricWithMeta<number | null>;
  hoursStreamed: MetricWithMeta<number | null>;
  streamCount?: MetricWithMeta<number | null>;
  lastStreamDate: string | null;
  isDemo: boolean;
  dataType?: DataOrigin;
  confidence?: ConfidenceLevel;
  capturedAt?: string;
  createdAt: string;
  updatedAt: string;
  verificationDate: string;
  source: string;
}

export interface ChannelSnapshot {
  id: string;
  streamerId: string;
  streamerUsername?: string;
  streamerDisplayName?: string;
  date: string;
  period: string;
  followers: number | null;
  avgViewers: number | null;
  peakViewers: number | null;
  hoursStreamed: number | null;
  streamCount?: number | null;
  category: string;
  source: string;
  notes?: string;
  verificationDate?: string;
  dataType?: MetricDataType;
  origin?: DataOrigin;
  capturedAt?: string;
  confidence?: ConfidenceLevel;
  isDemo?: boolean;
}

export interface CategoryData {
  id: string;
  name: string;
  channelCount: number;
  avgViewers: number;
  totalHours: number;
  totalFollowers: number;
  peakViewers: number;
  activeChannels: number;
  description: string;
}

export interface GrowthIndicator {
  absoluteChange: number | null;
  percentageChange: number | null;
  periodText: string;
  displayText: string;
  trend: 'positive' | 'negative' | 'neutral' | 'no_data';
}

export interface RegionMetric {
  state: string;
  confirmedChannels: number;
  totalFollowers: number;
  avgViewers: number;
  topChannels: string[];
  hasConfirmedLocation: boolean;
}

export interface AlertRule {
  id: string;
  title: string;
  type: 'followers_increase' | 'peak_viewers' | 'resumed_streaming' | 'days_inactive';
  streamerUsername?: string;
  conditionDescription: string;
  threshold: number;
  enabled: boolean;
  connectorStatus: 'ready' | 'pending_connector';
  lastTriggered?: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  details: string;
  operator: string;
}

export interface DataReport {
  id: string;
  title: string;
  generatedDate: string;
  period: string;
  channelsAnalyzed: number;
  totalFollowers: number;
  avgViewers: number;
  totalHoursStreamed: number;
  peakPlatformAudience: number;
  topCategories: { name: string; share: number }[];
  emergentChannels: { username: string; displayName: string; growthMetric: string }[];
  methodologicalNotes: string[];
  sources: string[];
}

export interface QualityIssue {
  type: 'warning' | 'error';
  category: 'missing' | 'stale' | 'duplicate' | 'invalid' | 'impossible';
  message: string;
  target: string;
}

export interface QualityAuditReport {
  totalChannels: number;
  validChannelsCount: number;
  withSourceCount: number;
  needsUpdateCount: number;
  noHistoryCount: number;
  incompleteCount: number;
  duplicatesCount: number;
  demoCount?: number;
  totalSnapshots?: number;
  sourcesCount?: number;
  completePercent?: number;
  incompletePercent?: number;
  issues: QualityIssue[];
  auditedAt: string;
}

export interface ImportValidationResult {
  valid: boolean;
  validCount: number;
  modifiedCount: number;
  newCount: number;
  errorCount: number;
  errors: string[];
  warnings: string[];
  duplicatesDetected?: DuplicateCandidate[];
  parsedPayload?: {
    streamers?: Streamer[];
    snapshots?: ChannelSnapshot[];
    categories?: CategoryData[];
    sources?: RegisteredSource[];
  };
}

// Phase 3 & 4 Extensions:
export type SourceType = 'KICK_PUBLIC' | 'MANUAL' | 'CSV_IMPORT' | 'JSON_IMPORT' | 'OTHER_PUBLIC' | 'DEMO' | 'IMPORTED';

export type DataConnectionStatus = 'NO_SOURCE' | 'MANUAL' | 'IMPORT' | 'CONNECTED' | 'ERROR';

export type DataFreshnessStatus = 'ACTUALIZADO' | 'RECIENTE' | 'DESACTUALIZADO' | 'ANTIGUO' | 'SIN DATOS';

export interface FreshnessInfo {
  status: DataFreshnessStatus;
  daysOld: number;
  lastCaptureDate: string;
  badgeClass: string;
}

export type ImportJobStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';

export interface ImportJob {
  id: string;
  startedAt: string;
  finishedAt: string;
  source: string;
  sourceType: SourceType;
  records: number;
  created: number;
  updated: number;
  unchanged: number;
  duplicates: number;
  errors: string[];
  warnings: string[];
  status: ImportJobStatus;
  changeCount: number;
  backupIdBefore?: string;
  rollbackData?: {
    previousStreamers: Streamer[];
    previousSnapshots: ChannelSnapshot[];
    appliedStreamerIds: string[];
    newStreamerIds: string[];
  };
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  date: string;
  streamerUsername: string;
  streamerDisplayName: string;
  field: string;
  fieldName?: string;
  previousValue: number | string;
  newValue: number | string;
  diffAbsolute?: number;
  changeText: string;
  pctText?: string;
  trend: 'up' | 'down' | 'same';
  source: string;
  importJobId?: string;
}

export interface StreamerDiffItem {
  username: string;
  displayName: string;
  isNew: boolean;
  isUnchanged: boolean;
  changes: {
    field: string;
    label: string;
    previous: number | string;
    next: number | string;
    diffText: string;
    pctText?: string;
    trend: 'up' | 'down' | 'same';
  }[];
}

export interface SnapshotDuplicateConflict {
  id: string;
  username: string;
  date: string;
  existingSnapshot: ChannelSnapshot;
  incomingSnapshot: ChannelSnapshot;
  existingSource: string;
  newSource: string;
  resolution?: 'KEEP' | 'REPLACE' | 'MERGE' | 'CANCEL';
}

export interface StorageStats {
  type: 'LOCAL_STORAGE' | 'INDEXED_DB';
  activeAdapter?: 'LOCAL_STORAGE' | 'INDEXED_DB';
  recordCount?: number;
  itemCount?: number;
  quotaPercent?: number;
  streamersCount: number;
  snapshotsCount: number;
  changesCount: number;
  importJobsCount: number;
  estimatedSizeKb: number;
  isIndexedDbSupported: boolean;
  lastBackupAt: string | null;
}

export interface AuditActionLog {
  id: string;
  timestamp: string;
  category: 'IMPORT' | 'CHANGE' | 'ROLLBACK' | 'BACKUP' | 'RESTORE' | 'ERROR' | 'AUDIT' | 'PROVIDER';
  title: string;
  details: string;
  operator: string;
  metadata?: Record<string, unknown>;
}

export interface RegisteredSource {
  id: string;
  sourceId?: string;
  name: string;
  sourceName?: string;
  url: string | null;
  sourceUrl?: string | null;
  type: SourceType;
  sourceType?: SourceType;
  capturedAt: string;
  importedAt?: string;
  verified: boolean;
  notes?: string;
}

export type AlertCategory = 'CRECIMIENTO' | 'AUDIENCIA' | 'ACTIVIDAD' | 'DATOS';
export type AlertSeverity = 'INFO' | 'CAMBIO' | 'ADVERTENCIA' | 'DATOS';

export interface SystemAlert {
  id: string;
  type: string; // e.g., 'unusual_follower_surge', 'peak_viewers_record', 'activity_drop', 'stale_data'
  category: AlertCategory;
  severity: AlertSeverity;
  streamerId?: string;
  streamerUsername: string;
  streamerDisplayName: string;
  date: string;
  metric: string;
  previousValue: number | string | null;
  currentValue: number | string | null;
  variation: string;
  source: string;
  description: string;
  detectedAt: string;
  isDemo: boolean;
}

export type DataRecencyCategory = 'ACTUALIZADO' | 'DESACTUALIZADO' | 'ANTIGUO' | 'MUY_ANTIGUO';

export type HistoricalCoverageLevel = 'ALTA' | 'MEDIA' | 'BAJA' | 'HISTÓRICO_INSUFICIENTE';

export interface HistoricalCoverageReport {
  monthsSpan: number;
  snapshotsCount: number;
  coverage: HistoricalCoverageLevel;
  firstSnapshotDate: string | null;
  lastSnapshotDate: string | null;
}

export type GlobalDataStatus = 'REAL' | 'MANUAL' | 'DEMO' | 'MIXED' | 'NO_DATA';

export interface DuplicateCandidate<T = unknown> {
  id: string;
  entityType: 'streamer' | 'snapshot';
  existingItem: T;
  incomingItem: T;
  matchReason: string;
  streamerUsername: string;
  date?: string;
}

export type ReportType =
  | 'streamer'
  | 'mexico'
  | 'category'
  | 'growth'
  | 'activity'
  | 'quality';

export interface GeneratedAnalyticalReport {
  id: string;
  title: string;
  reportType: ReportType;
  generatedDate: string;
  period: string;
  channelsAnalyzed: number;
  sources: string[];
  methodology: string[];
  limitations: string[];
  dataSummary: {
    totalFollowers?: number;
    avgViewers?: number;
    peakAudience?: number;
    totalHours?: number;
    activeChannelsCount?: number;
    [key: string]: unknown;
  };
  keyFindings: string[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
}

// ==========================================
// FASE 6 — COMPLIANCE, DISCOVERY & COVERAGE
// ==========================================

export type DataClassification =
  | 'KICK_API_DATA'
  | 'INTERNAL_DERIVED_DATA'
  | 'MANUAL_DATA'
  | 'DEMO_DATA';

export type SnapshotRetentionPolicyStatus =
  | 'PERSISTENT_ALLOWED'
  | 'TEMPORARY_CACHE'
  | 'MANUAL'
  | 'DEMO'
  | 'NOT_ALLOWED';

export type DiscoveryStatus =
  | 'NEW'
  | 'KNOWN'
  | 'VERIFIED'
  | 'REJECTED'
  | 'PENDING'
  | 'STALE';

export type RegionalVerificationStatus =
  | 'VERIFIED_MX'
  | 'PENDING'
  | 'NOT_VERIFIED'
  | 'UNKNOWN';

export interface RegionalVerification {
  status: RegionalVerificationStatus;
  verificationSource?: string;
  verificationDate?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface DiscoveryCandidate {
  id: string;
  username: string;
  channelId?: string;
  displayName: string;
  source: string;
  discoveredAt: string;
  lastSeen: string;
  status: DiscoveryStatus;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  countryStatus: RegionalVerificationStatus;
  category?: string;
  bio?: string | null;
  avatarUrl?: string;
  followersCount?: number | null;
  regionalVerification?: RegionalVerification;
  notes?: string;
}

export type CoverageStatus =
  | 'DISCOVERED'
  | 'VERIFIED'
  | 'MONITORED'
  | 'STALE'
  | 'REMOVED';

export type SyncPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface MonitoredChannel {
  streamerId: string;
  username: string;
  displayName: string;
  category: string;
  status: CoverageStatus;
  isMonitored: boolean;
  lastPolledAt: string | null;
  source: string;
  priority: SyncPriority;
  addedAt: string;
  failureCount: number;
}

export type ApiDataFreshnessStatus =
  | 'FRESH'
  | 'AGING'
  | 'STALE'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface RequestBudget {
  pendingChannelsCount: number;
  estimatedRequests: number;
  availableRequests: number;
  rateLimitRemaining: number;
  isSafe: boolean;
  status: 'SEGURO' | 'LIMITADO';
  recommendedBatchSize: number;
  warningMessage?: string;
}

export interface CoverageStats {
  totalDiscovered: number;
  totalKnown: number;
  totalVerified: number;
  totalMonitored: number;
  totalPending: number;
  totalStale: number;
  mexicoVerified: number;
  mexicoPending: number;
  mexicoUnknown: number;
}


