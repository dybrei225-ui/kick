import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  MapPin,
  Building2,
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  AlertCircle,
  TrendingUp,
  Radio,
  Twitter,
  Instagram,
  Youtube,
  Globe,
  MessageSquare,
  ShieldCheck,
  PlusCircle,
  X,
  Database,
  Save,
  Info,
  Users,
  Zap,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Streamer, ChannelSnapshot } from '../types';
import { dataService } from '../services/dataService';
import { MetricExplanation } from '../components/MetricExplanation';
import {
  formatNumber,
  formatCompactNumber,
  formatHours,
  formatDate,
  formatFullDate,
  getStatusInfo,
  getCategoryBadgeColor,
} from '../utils/formatters';
import { calculateGrowth } from '../utils/math';
import { MetricCard } from '../components/MetricCard';
import { AreaLineChart } from '../components/Charts';
import { PageRoute } from '../components/Navigation';

interface StreamerProfilePageProps {
  username: string;
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

export const StreamerProfilePage: React.FC<StreamerProfilePageProps> = ({
  username,
  onNavigate,
}) => {
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [snapshots, setSnapshots] = useState<ChannelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '6m' | '1a' | 'historico'>('30d');
  const [copied, setCopied] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // New Snapshot Form State
  const [newSnapDate, setNewSnapDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSnapPeriod, setNewSnapPeriod] = useState('Últimos 30 días');
  const [newSnapFollowers, setNewSnapFollowers] = useState('');
  const [newSnapAvgViewers, setNewSnapAvgViewers] = useState('');
  const [newSnapPeakViewers, setNewSnapPeakViewers] = useState('');
  const [newSnapHours, setNewSnapHours] = useState('');
  const [newSnapStreamCount, setNewSnapStreamCount] = useState('');
  const [newSnapCategory, setNewSnapCategory] = useState('Just Chatting');
  const [newSnapSource, setNewSnapSource] = useState('KICK Perfil Público Observado');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [syncingWithApi, setSyncingWithApi] = useState(false);

  const handleSyncWithApi = async () => {
    if (!streamer) return;
    setSyncingWithApi(true);
    try {
      const realProvider = dataService.getRealProvider();
      const res = await realProvider.syncSingleStreamer(streamer.username);
      if (res.success && res.streamer) {
        setStreamer(res.streamer);
        const snaps = await dataService.getSnapshots(res.streamer.id);
        setSnapshots(snaps);
        setSaveSuccessNotice('Sincronizado exitosamente con KICK Public API (OAuth 2.1). Snapshot capturado.');
        setTimeout(() => setSaveSuccessNotice(null), 5000);
      } else {
        alert(res.error || 'No fue posible sincronizar con KICK API.');
      }
    } catch (err: unknown) {
      alert(`Error al sincronizar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingWithApi(false);
    }
  };

  const fetchStreamerData = async () => {
    setLoading(true);
    const data = await dataService.getStreamer(username);
    if (data) {
      setStreamer(data);
      const snaps = await dataService.getSnapshots(data.id);
      setSnapshots(snaps);
      setNewSnapCategory(data.primaryCategory || 'Just Chatting');
      setNewSnapFollowers(data.followers.value ? String(data.followers.value) : '');
      setNewSnapAvgViewers(data.avgViewers.value ? String(data.avgViewers.value) : '');
      setNewSnapPeakViewers(data.peakViewers.value ? String(data.peakViewers.value) : '');
      setNewSnapHours(data.hoursStreamed.value ? String(data.hoursStreamed.value) : '');
    } else {
      setStreamer(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStreamerData();
  }, [username]);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-[#53FC18] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs">Cargando perfil verificado de @{username}...</p>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-8">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Canal no registrado</h2>
          <p className="text-xs text-zinc-400 mt-2">
            No se encontraron métricas públicas para el usuario <strong className="text-white">@{username}</strong> en KICK México.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => onNavigate('streamers')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
            >
              Volver al explorador
            </button>
            <button
              onClick={() => onNavigate('admin_import')}
              className="px-4 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black rounded-lg text-xs font-bold"
            >
              Registrar canal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusInfo(streamer.status);

  // Analytics Engine Phase 7 Integrations
  const analyticsGrowth = dataService.analytics.getMetric(
    'follower_growth_percentage',
    streamer,
    snapshots,
    selectedPeriod
  );
  const analyticsRatio = dataService.analytics.getMetric(
    'viewer_follower_ratio',
    streamer,
    snapshots,
    selectedPeriod
  );
  const analyticsConsistency = dataService.analytics.getMetric(
    'activity_consistency',
    streamer,
    snapshots,
    selectedPeriod
  );
  const analyticsQuality = dataService.analytics.getMetric(
    'data_quality',
    streamer,
    snapshots,
    selectedPeriod
  );
  const detectedAnomalies = dataService.analytics.anomaly.detectAnomalies(streamer, snapshots);

  // Growth calculations
  const pastSnapshot = snapshots.find((s) => s.period.includes(selectedPeriod) || s.period.includes('30 días')) || snapshots[snapshots.length - 1];
  const followerGrowth = calculateGrowth(streamer.followers.value, pastSnapshot?.followers ?? null, selectedPeriod);
  const viewerGrowth = calculateGrowth(streamer.avgViewers.value, pastSnapshot?.avgViewers ?? null, selectedPeriod);

  // Filter snapshots based on selected period
  const filteredSnapshots = snapshots.filter((s) => {
    if (selectedPeriod === '7d') return s.date >= '2026-09-13';
    if (selectedPeriod === '30d') return s.date >= '2026-08-20';
    if (selectedPeriod === '90d') return s.date >= '2026-06-20';
    if (selectedPeriod === '6m') return s.date >= '2026-03-20';
    if (selectedPeriod === '1a') return s.date >= '2025-09-20';
    return true; // historico
  });

  const chartHistoryPoints = snapshots.map((s) => ({
    label: formatDate(s.date),
    value: s.followers,
    secondaryValue: s.avgViewers,
    date: s.date,
  }));

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamer) return;

    const snapshotToSave: ChannelSnapshot = {
      id: `snap-${streamer.id}-${Date.now()}`,
      streamerId: streamer.id,
      date: newSnapDate,
      period: newSnapPeriod,
      followers: newSnapFollowers ? parseInt(newSnapFollowers, 10) : null,
      avgViewers: newSnapAvgViewers ? parseInt(newSnapAvgViewers, 10) : null,
      peakViewers: newSnapPeakViewers ? parseInt(newSnapPeakViewers, 10) : null,
      hoursStreamed: newSnapHours ? parseFloat(newSnapHours) : null,
      streamCount: newSnapStreamCount ? parseInt(newSnapStreamCount, 10) : null,
      category: newSnapCategory || streamer.primaryCategory,
      source: newSnapSource || 'KICK Perfil Público Observado',
      origin: 'manual',
      confidence: 'high',
    };

    await dataService.saveSnapshot(snapshotToSave);
    setIsSnapshotModalOpen(false);
    setSaveSuccessNotice('Captura guardada exitosamente sin scraping.');
    setTimeout(() => setSaveSuccessNotice(null), 4000);
    await fetchStreamerData();
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return <Twitter className="w-3.5 h-3.5" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5" />;
      case 'discord':
        return <MessageSquare className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div id="streamer-profile-page" className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <button
          onClick={() => onNavigate('streamers')}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al explorador</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Button: Registrar nueva captura (Requirement 5) */}
          <button
            onClick={() => setIsSnapshotModalOpen(true)}
            id="btn-registrar-nueva-captura"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18231d] border border-[#53FC18]/40 hover:border-[#53FC18] text-[#53FC18] text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(83,252,24,0.1)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Registrar nueva captura</span>
          </button>

          <button
            onClick={copyProfileUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141a1d] border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#53FC18]" />
                <span className="text-[#53FC18]">Enlace copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="mb-4 p-3 bg-[#111c15] border border-[#53FC18] rounded-xl text-xs text-[#53FC18] flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={streamer.avatarUrl}
              alt={streamer.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-zinc-700 shadow-md flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {streamer.displayName}
                </h1>
                {streamer.publicName && (
                  <span className="text-xs text-zinc-400 font-normal">({streamer.publicName})</span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${status.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                  {status.label}
                </span>
              </div>

              <div className="font-mono text-sm text-[#53FC18] mt-0.5">@{streamer.username}</div>

              {/* Location & Organization details */}
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#53FC18]" />
                  {streamer.city && streamer.state ? (
                    <span className="text-slate-300">{streamer.city}, {streamer.state}</span>
                  ) : streamer.state ? (
                    <span className="text-slate-300">{streamer.state}, México</span>
                  ) : (
                    <span className="text-zinc-500 italic">Ubicación específica no disponible</span>
                  )}
                </span>

                {streamer.organization && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    {streamer.organization}
                  </span>
                )}

                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">Verificado: {formatDate(streamer.verificationDate)}</span>
              </div>
            </div>
          </div>

          {/* Primary Action: Official KICK External Link Button */}
          <div className="w-full sm:w-auto flex flex-col gap-2">
            <a
              id="btn-ver-canal-en-kick"
              href={streamer.kickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(83,252,24,0.2)] flex items-center justify-center gap-2"
            >
              <span>Ver canal en KICK</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="text-[10px] text-zinc-500 text-center sm:text-right">
              Enlace externo oficial verificado
            </div>
          </div>
        </div>

        {/* Bio */}
        {streamer.bio && (
          <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-300 leading-relaxed max-w-3xl">
            {streamer.bio}
          </div>
        )}

        {/* Categories & Social Networks */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-500 font-medium">Categorías utilizadas:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] border font-medium ${getCategoryBadgeColor(streamer.primaryCategory)}`}>
              {streamer.primaryCategory} (Principal)
            </span>
            {streamer.categories
              ?.filter((c) => c !== streamer.primaryCategory)
              .map((cat) => (
                <span key={cat} className={`px-2 py-0.5 rounded text-[11px] border ${getCategoryBadgeColor(cat)}`}>
                  {cat}
                </span>
              ))}
          </div>

          {streamer.socialLinks && streamer.socialLinks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium">Redes públicas:</span>
              <div className="flex items-center gap-1.5">
                {streamer.socialLinks.map((net) => (
                  <a
                    key={net.platform}
                    href={net.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-[#161c20] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                    title={`${net.platform}: ${net.handle || ''}`}
                  >
                    {getSocialIcon(net.platform)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Stream Banner (Fase 5, Req 20) */}
      {streamer.avgViewers?.period === 'En vivo' && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-pulse">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white font-black text-[11px]">
              <Radio className="w-3.5 h-3.5 animate-spin" /> EN DIRECTO
            </span>
            <div>
              <p className="font-bold text-white text-sm">Transmisión Activa en KICK</p>
              <p className="text-zinc-400">Categoría: {streamer.primaryCategory}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-lg font-black text-red-400">{formatNumber(streamer.avgViewers.value || 0)}</p>
            <p className="text-[10px] text-zinc-400">Espectadores actuales (KICK API)</p>
          </div>
        </div>
      )}

      {/* Barra de Procedencia y Transparencia KICK API (Fase 5, Reqs 19, 24, 25) */}
      <div className="mt-4 bg-[#101518] border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-zinc-300">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">FUENTE:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px]">
              {streamer.source || 'KICK Public API'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">TIPO:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-mono text-[11px] font-bold">
              {streamer.isDemo ? 'DEMO' : 'OBSERVADO'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">ÚLTIMA CAPTURA:</span>
            <span className="text-zinc-300 font-mono text-[11px]">
              {streamer.capturedAt ? new Date(streamer.capturedAt).toLocaleString('es-MX') : '22/09/2026 12:45'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">HISTÓRICO DISPONIBLE:</span>
            <span className="text-cyan-400 font-mono text-[11px]">
              desde {formatDate(snapshots.length > 0 ? [...snapshots].sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0].date : streamer.verificationDate || '2026-09-22')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">PAÍS:</span>
            <span className={`font-mono text-[11px] ${streamer.country === 'México' ? 'text-[#53FC18]' : 'text-zinc-500 italic'}`}>
              {streamer.country === 'México' ? 'México (Verificado)' : 'NO DISPONIBLE'}
            </span>
          </div>
        </div>

        <button
          onClick={handleSyncWithApi}
          disabled={syncingWithApi}
          className="px-3.5 py-1.5 rounded-lg bg-[#18231d] hover:bg-[#203126] border border-[#53FC18]/60 text-[#53FC18] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingWithApi ? 'animate-spin' : ''}`} />
          {syncingWithApi ? 'Sincronizando...' : 'SINCRONIZAR AHORA'}
        </button>
      </div>

      {/* Distinction: Métricas Observadas vs Calculadas (Requirement 5) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Métricas Observadas</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 font-mono text-zinc-400 font-normal">
              Contadores públicos directos
            </span>
          </h2>
          <span className="text-xs text-zinc-500">
            Última verificación: {formatFullDate(streamer.verificationDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            id="metric-followers"
            title="Seguidores"
            metric={streamer.followers}
            icon={<Users className="w-3.5 h-3.5" />}
            highlight
            growth={followerGrowth}
          />

          <MetricCard
            id="metric-peak-viewers"
            title="Pico de espectadores"
            metric={streamer.peakViewers}
            icon={<Zap className="w-3.5 h-3.5" />}
          />

          <MetricCard
            id="metric-streams-count"
            title="Transmisiones registradas"
            metric={{
              value: streamer.streamCount?.value ?? null,
              capturedAt: streamer.streamCount?.capturedAt || streamer.verificationDate,
              source: streamer.source,
              period: streamer.streamCount?.period || 'Últimos 30 días',
              type: 'observed',
            }}
            icon={<Radio className="w-3.5 h-3.5" />}
            customFormatter={(val: number | null) => (val !== null ? `${val} directos` : 'NO DISPONIBLE')}
          />

          <MetricCard
            id="metric-last-stream"
            title="Última transmisión"
            metric={{
              value: null,
              capturedAt: streamer.verificationDate,
              source: streamer.source,
              period: 'Histórico',
              type: 'observed',
            }}
            icon={<Calendar className="w-3.5 h-3.5" />}
            customFormatter={() => formatDate(streamer.lastStreamDate)}
          />
        </div>
      </div>

      {/* Métricas Calculadas & Estimaciones (Fase 7 Analytics Engine) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Métricas Calculadas
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono">
              Fórmulas Deterministas
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            Ventana: {selectedPeriod.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Tasa de Crecimiento */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Crecimiento ({selectedPeriod})
                </span>
                <MetricExplanation metric={analyticsGrowth} variant="icon" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-[#53FC18]">
                  {analyticsGrowth.formattedValue}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{analyticsGrowth.statusReason || `Variación neta en ${selectedPeriod}`}</span>
              <MetricExplanation metric={analyticsGrowth} variant="badge" />
            </div>
          </div>

          {/* 2. Ratio Viewers / Followers */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ratio Viewers / Followers
                </span>
                <MetricExplanation metric={analyticsRatio} variant="icon" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-white">
                  {analyticsRatio.formattedValue}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Proporción concurrente</span>
              <MetricExplanation metric={analyticsRatio} variant="badge" />
            </div>
          </div>

          {/* 3. Indicador de Regularidad Observada */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Regularidad Observada
                </span>
                <MetricExplanation metric={analyticsConsistency} variant="icon" />
              </div>
              <div className="mt-3">
                <span className="text-lg font-bold font-mono text-sky-400">
                  {analyticsConsistency.formattedValue}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="truncate">Estabilidad de calendario</span>
              <MetricExplanation metric={analyticsConsistency} variant="badge" />
            </div>
          </div>

          {/* 4. Data Quality Score */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Data Quality Score
                </span>
                <MetricExplanation metric={analyticsQuality} variant="icon" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-white">
                  {analyticsQuality.quality.score} <span className="text-xs font-normal text-zinc-400">/ 100</span>
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-semibold">{analyticsQuality.quality.label}</span>
              <MetricExplanation metric={analyticsQuality} variant="badge" />
            </div>
          </div>
        </div>
      </div>

      {/* Anomalías Estadísticas si existen (MAD) */}
      {detectedAnomalies.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs">
          <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Desviaciones Atípicas Detectadas en la Muestra ({detectedAnomalies.length})</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed text-[11px] mb-3">
            El valor observado se encuentra fuera del rango habitual de la muestra analizada. No se determina la causa ni se infiere conducta indebida o manipulación.
          </p>
          <div className="space-y-2">
            {detectedAnomalies.map((anom) => (
              <div key={anom.id} className="p-2.5 rounded-xl bg-black/40 border border-amber-800/30 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">{anom.metricName}</span>
                  <span className="text-zinc-400 text-[10px] block">Fecha de corte: {anom.observedDate}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-amber-400 font-bold block">{anom.observedValue.toLocaleString('es-MX')}</span>
                  <span className="text-zinc-500 text-[10px]">Esperado: ~{anom.expectedValue.toLocaleString('es-MX')} ({anom.deviationMagnitude})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Evolution Section (7d, 30d, 90d, 6m, 1a, histórico) */}
      <div className="mt-8 bg-[#111619] border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#53FC18]" />
              <span>Evolución Histórica de Registros</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Instantáneas temporales públicas registradas para @{streamer.username}
            </p>
          </div>

          {/* Period Filter Selector */}
          <div className="flex items-center gap-1 bg-[#0e1315] p-1 rounded-xl border border-zinc-800 overflow-x-auto self-start sm:self-auto">
            {(['7d', '30d', '90d', '6m', '1a', 'historico'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPeriod === period
                    ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {period === '7d'
                  ? '7 días'
                  : period === '30d'
                  ? '30 días'
                  : period === '90d'
                  ? '90 días'
                  : period === '6m'
                  ? '6 meses'
                  : period === '1a'
                  ? '1 año'
                  : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="mt-4">
          {filteredSnapshots.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 bg-[#0e1315] rounded-xl border border-zinc-800/80">
              No hay capturas registradas en este periodo. Usa el botón &quot;Registrar nueva captura&quot; arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Periodo</th>
                    <th className="py-2.5 px-3 text-right">Seguidores</th>
                    <th className="py-2.5 px-3 text-right">Avg viewers</th>
                    <th className="py-2.5 px-3 text-right">Pico</th>
                    <th className="py-2.5 px-3 text-right">Horas</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredSnapshots.map((snap) => (
                    <tr key={snap.id} className="hover:bg-[#161e22]/50">
                      <td className="py-2.5 px-3 text-white">{formatDate(snap.date)}</td>
                      <td className="py-2.5 px-3 font-sans text-zinc-400 text-[11px]">{snap.period}</td>
                      <td className="py-2.5 px-3 text-right text-white font-bold">
                        {snap.followers !== null ? formatNumber(snap.followers) : 'NO DISPONIBLE'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#53FC18] font-bold">
                        {snap.avgViewers !== null ? formatNumber(snap.avgViewers) : 'NO DISPONIBLE'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        {snap.peakViewers !== null ? formatNumber(snap.peakViewers) : 'NO DISPONIBLE'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        {snap.hoursStreamed !== null ? formatHours(snap.hoursStreamed) : 'NO DISPONIBLE'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${getCategoryBadgeColor(snap.category)}`}>
                          {snap.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans text-[11px] text-zinc-400 truncate">
                        {snap.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Evolution Chart */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <AreaLineChart
            id="chart-streamer-evolution"
            title="Evolución de seguidores en el tiempo"
            periodText={`Historial acumulado disponible (${filteredSnapshots.length} capturas)`}
            data={chartHistoryPoints}
            unit="seguidores"
            color="#53FC18"
            height={220}
          />
        </div>
      </div>

      {/* Notes & Methodology (Requirement 5) */}
      <div className="mt-6 p-4 bg-[#111714] border border-[#53FC18]/30 rounded-2xl text-xs text-slate-300 leading-relaxed">
        <div className="flex items-center gap-2 mb-2 font-bold text-white">
          <ShieldCheck className="w-4 h-4 text-[#53FC18]" />
          <span>Notas Metodológicas del Canal</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li>
            <strong>Fuente declarada:</strong> {streamer.source}
          </li>
          <li>
            <strong>Criterio de corte:</strong> Las capturas se basan en el contador público oficial en kick.com/{streamer.username}.
          </li>
          <li>
            <strong>Privacidad:</strong> No se exponen datos personales privados. La ubicación se limita a la confirmada por el propio creador en sus redes públicas.
          </li>
          <li>
            <strong>Actualización manual:</strong> Cualquier administrador u operador puede pulsar &quot;Registrar nueva captura&quot; para añadir datos actualizados sin infringir directrices técnicas.
          </li>
        </ul>
      </div>

      {/* Modal: Registrar nueva captura (Requirement 5) */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12171a] border border-zinc-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#53FC18]" />
                <h3 className="font-bold text-base text-white">Registrar Nueva Captura Manual</h3>
              </div>
              <button
                onClick={() => setIsSnapshotModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-[#16201b] border border-[#53FC18]/30 rounded-xl text-zinc-300">
                Registrando snapshot histórico para <strong className="text-white">@{streamer.username}</strong> sin scraping ni bots.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Fecha de la captura</label>
                  <input
                    type="date"
                    required
                    value={newSnapDate}
                    onChange={(e) => setNewSnapDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Etiqueta de periodo</label>
                  <input
                    type="text"
                    required
                    value={newSnapPeriod}
                    onChange={(e) => setNewSnapPeriod(e.target.value)}
                    placeholder="Ej. Últimos 30 días, Septiembre 2026..."
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Seguidores observados</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 12500"
                    value={newSnapFollowers}
                    onChange={(e) => setNewSnapFollowers(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Audiencia promedio</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 350"
                    value={newSnapAvgViewers}
                    onChange={(e) => setNewSnapAvgViewers(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Pico máximo</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 1200"
                    value={newSnapPeakViewers}
                    onChange={(e) => setNewSnapPeakViewers(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Horas en directo</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ej. 45.5"
                    value={newSnapHours}
                    onChange={(e) => setNewSnapHours(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Streams emitidos</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 12"
                    value={newSnapStreamCount}
                    onChange={(e) => setNewSnapStreamCount(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Categoría principal</label>
                  <input
                    type="text"
                    value={newSnapCategory}
                    onChange={(e) => setNewSnapCategory(e.target.value)}
                    placeholder="Ej. Just Chatting, Gaming..."
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Fuente pública verificada</label>
                  <input
                    type="text"
                    value={newSnapSource}
                    onChange={(e) => setNewSnapSource(e.target.value)}
                    placeholder="Ej. KICK Perfil Público Observado"
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar captura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
