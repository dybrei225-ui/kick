/**
 * KICK ANALYTICS MX — Motor de Inteligencia Analítica (/analitica)
 * Módulo de análisis estadístico transparente, reproducible y auditable.
 * Regla de Oro: Prohibido inventar datos, separar OBSERVADO de CALCULADO, proveniencia visible.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  Grid3X3,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  GitCompare,
  Download,
  Info,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Streamer, CategoryData, ChannelSnapshot } from '../types';
import { AnalyticalPeriod, MetricResult, StatisticalAnomaly } from '../engine/analytics/types';
import { dataService } from '../services/dataService';
import { MetricExplanation } from '../components/MetricExplanation';
import { formatNumber } from '../utils/formatters';

interface AnalyticsPageProps {
  streamers: Streamer[];
  categories: CategoryData[];
  onSelectStreamer?: (username: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  streamers,
  categories,
  onSelectStreamer,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticalPeriod>('30d');
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'crecimiento' | 'audiencia' | 'actividad' | 'categorias' | 'anomalias' | 'comparador' | 'catalogo'
  >('resumen');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [transparencyMode, setTransparencyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [snapshots, setSnapshots] = useState<ChannelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected streamers for comparison tab
  const [comparisonSelection, setComparisonSelection] = useState<string[]>([]);

  // Load all snapshots
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const allSnaps = await dataService.getAllSnapshots();
      if (isMounted) {
        setSnapshots(allSnaps);
        setLoading(false);
        // Default comparison selection to top 2 streamers if available
        if (streamers.length >= 2 && comparisonSelection.length === 0) {
          setComparisonSelection([streamers[0].username, streamers[1].username]);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [streamers]);

  // Snapshots grouped by streamer ID
  const snapshotsByStreamer = useMemo(() => {
    const map = new Map<string, ChannelSnapshot[]>();
    for (const snap of snapshots) {
      const list = map.get(snap.streamerId) || [];
      list.push(snap);
      map.set(snap.streamerId, list);
    }
    return map;
  }, [snapshots]);

  // Filtered streamers list
  const filteredStreamers = useMemo(() => {
    return streamers.filter((s) => {
      const matchSearch =
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategory === 'all' ||
        s.primaryCategory.toLowerCase() === selectedCategory.toLowerCase() ||
        s.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [streamers, searchQuery, selectedCategory]);

  // Compute metrics for each filtered streamer in memory
  const analyzedStreamers = useMemo(() => {
    return filteredStreamers.map((s) => {
      const sSnaps = snapshotsByStreamer.get(s.id) || [];
      const growth = dataService.analytics.getMetric(
        'follower_growth_percentage',
        s,
        sSnaps,
        selectedPeriod
      );
      const growthAbs = dataService.analytics.getMetric(
        'follower_growth_absolute',
        s,
        sSnaps,
        selectedPeriod
      );
      const followers = dataService.analytics.getMetric('current_followers', s, sSnaps, selectedPeriod);
      const avgViewers = dataService.analytics.getMetric('average_viewers', s, sSnaps, selectedPeriod);
      const medianViewers = dataService.analytics.getMetric('median_viewers', s, sSnaps, selectedPeriod);
      const peakViewers = dataService.analytics.getMetric('peak_viewers', s, sSnaps, selectedPeriod);
      const ratio = dataService.analytics.getMetric('viewer_follower_ratio', s, sSnaps, selectedPeriod);
      const streamCount = dataService.analytics.getMetric('stream_count', s, sSnaps, selectedPeriod);
      const streamFreq = dataService.analytics.getMetric('stream_frequency', s, sSnaps, selectedPeriod);
      const duration = dataService.analytics.getMetric('stream_duration', s, sSnaps, selectedPeriod);
      const regularity = dataService.analytics.getMetric('activity_consistency', s, sSnaps, selectedPeriod);
      const quality = dataService.analytics.getMetric('data_quality', s, sSnaps, selectedPeriod);
      const trend = dataService.analytics.trend.analyzeTrend(s, sSnaps, selectedPeriod);

      return {
        streamer: s,
        snapshotsCount: sSnaps.length,
        metrics: {
          followers,
          growth,
          growthAbs,
          avgViewers,
          medianViewers,
          peakViewers,
          ratio,
          streamCount,
          streamFreq,
          duration,
          regularity,
          quality,
        },
        trend,
      };
    });
  }, [filteredStreamers, snapshotsByStreamer, selectedPeriod]);

  // Global KPIs
  const globalSummary = useMemo(() => {
    const totalChannels = streamers.length;
    const totalObservations = snapshots.length;
    let availableMetricsCount = 0;
    let notAvailableMetricsCount = 0;
    let expiredCount = 0;

    analyzedStreamers.forEach((item) => {
      Object.values(item.metrics).forEach((m) => {
        if (m.status === 'AVAILABLE') availableMetricsCount++;
        else if (m.status === 'EXPIRED') expiredCount++;
        else notAvailableMetricsCount++;
      });
    });

    const isDemo = streamers.some((s) => s.isDemo);

    return {
      totalChannels,
      totalObservations,
      availableMetricsCount,
      notAvailableMetricsCount,
      expiredCount,
      isDemo,
    };
  }, [streamers, snapshots, analyzedStreamers]);

  // All anomalies across streamers
  const allAnomalies = useMemo(() => {
    const list: StatisticalAnomaly[] = [];
    for (const s of streamers) {
      const sSnaps = snapshotsByStreamer.get(s.id) || [];
      const anoms = dataService.analytics.anomaly.detectAnomalies(s, sSnaps);
      list.push(...anoms);
    }
    return list;
  }, [streamers, snapshotsByStreamer]);

  // Category analysis results
  const categoryAnalysisResults = useMemo(() => {
    return dataService.analytics.category.analyzeAllCategories(categories, streamers);
  }, [categories, streamers]);

  // Comparison items
  const comparisonItems = useMemo(() => {
    const selectedObj = streamers.filter((s) => comparisonSelection.includes(s.username));
    return dataService.analytics.comparison.compareStreamers(
      selectedObj,
      snapshotsByStreamer,
      selectedPeriod
    );
  }, [streamers, comparisonSelection, snapshotsByStreamer, selectedPeriod]);

  const toggleComparisonStreamer = (username: string) => {
    if (comparisonSelection.includes(username)) {
      setComparisonSelection(comparisonSelection.filter((u) => u !== username));
    } else {
      if (comparisonSelection.length >= 4) {
        alert('Puede comparar un máximo de 4 canales simultáneamente.');
        return;
      }
      setComparisonSelection([...comparisonSelection, username]);
    }
  };

  return (
    <div id="analytics-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="pb-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-6 h-6 text-[#53FC18]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Motor de Inteligencia Analítica
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20">
              FASE 7
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Plataforma estadística determinista, reproducible y auditable. Métricas basadas exclusivamente en observaciones documentadas sin interpolación ni suposiciones.
          </p>
        </div>

        {/* Period Selector & Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center rounded-xl bg-[#141a1d] border border-zinc-800 p-1">
            {(['7d', '30d', '90d', '6m', '1a', 'historico'] as AnalyticalPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === period
                    ? 'bg-[#53FC18] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Transparency Mode Toggle */}
          <button
            onClick={() => setTransparencyMode(!transparencyMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              transparencyMode
                ? 'bg-emerald-950/60 border-[#53FC18]/60 text-[#53FC18]'
                : 'bg-[#141a1d] border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Activar desglose de proveniencia visible en cada celda"
          >
            {transparencyMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Modo Transparencia</span>
          </button>
        </div>
      </div>

      {/* Global Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Canales en Muestra
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {globalSummary.totalChannels}
          </span>
          <span className="text-[10px] text-zinc-500">Muestra auditada</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Observaciones
          </span>
          <span className="text-xl font-black text-sky-400 font-mono mt-0.5 block">
            {globalSummary.totalObservations}
          </span>
          <span className="text-[10px] text-zinc-500">Capturas históricas</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Métricas Disponibles
          </span>
          <span className="text-xl font-black text-[#53FC18] font-mono mt-0.5 block">
            {globalSummary.availableMetricsCount}
          </span>
          <span className="text-[10px] text-emerald-500/80">Calculadas con éxito</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            No Disponibles
          </span>
          <span className="text-xl font-black text-zinc-400 font-mono mt-0.5 block">
            {globalSummary.notAvailableMetricsCount}
          </span>
          <span className="text-[10px] text-zinc-500">Sin muestra suficiente</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Anomalías (MAD)
          </span>
          <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
            {allAnomalies.length}
          </span>
          <span className="text-[10px] text-amber-400/80">Comportamiento atípico</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#12181b] border border-zinc-800/80">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Régimen de Datos
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${
              globalSummary.isDemo
                ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                : 'bg-emerald-950/60 text-[#53FC18] border border-emerald-800/40'
            }`}
          >
            {globalSummary.isDemo ? 'MODO DEMO' : 'OBSERVADO REAL'}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1">Cero interpolación</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-zinc-800 mt-6 scrollbar-none">
        {[
          { id: 'resumen', label: 'Resumen Global', icon: Activity },
          { id: 'crecimiento', label: 'Crecimiento', icon: TrendingUp },
          { id: 'audiencia', label: 'Audiencia & Concurrencia', icon: Users },
          { id: 'actividad', label: 'Actividad & Regularidad', icon: Clock },
          { id: 'categorias', label: 'Categorías', icon: Grid3X3 },
          { id: 'anomalias', label: `Anomalías (${allAnomalies.length})`, icon: AlertTriangle },
          { id: 'comparador', label: `Comparador (${comparisonSelection.length})`, icon: GitCompare },
          { id: 'catalogo', label: 'Catálogo de Fórmulas', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#182125] text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#12181b]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#53FC18]' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter Bar */}
      {['resumen', 'crecimiento', 'audiencia', 'actividad', 'comparador'].includes(activeTab) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por creador o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12181b] border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18]/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#12181b] border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-[#53FC18]/60"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filter Toggle: Only Available */}
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                onlyAvailable
                  ? 'bg-zinc-800 text-[#53FC18] border-[#53FC18]/40'
                  : 'bg-[#12181b] text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Solo disponibles</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: RESUMEN GLOBAL */}
      {/* ========================================================= */}
      {activeTab === 'resumen' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyzedStreamers.map(({ streamer, metrics, trend, snapshotsCount }) => {
              if (onlyAvailable && metrics.growth.status !== 'AVAILABLE') return null;

              return (
                <div
                  key={streamer.id}
                  onClick={() => onSelectStreamer && onSelectStreamer(streamer.username)}
                  className="p-4 rounded-2xl bg-[#12181b] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-xs border border-zinc-700 uppercase">
                          {streamer.username.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm group-hover:text-[#53FC18] transition-colors">
                              {streamer.displayName}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              @{streamer.username}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            {streamer.primaryCategory}
                          </span>
                        </div>
                      </div>

                      {/* Data Quality Badge */}
                      <div className="flex items-center gap-1">
                        <MetricExplanation metric={metrics.quality} variant="icon" />
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            metrics.quality.quality.score >= 80
                              ? 'bg-emerald-950/60 text-[#53FC18] border border-emerald-800/40'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          }`}
                          title={metrics.quality.quality.description}
                        >
                          Q: {metrics.quality.quality.score}
                        </span>
                      </div>
                    </div>

                    {/* Core Metric Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/60">
                      {/* Seguidores */}
                      <div className="p-2.5 rounded-xl bg-[#141a1d] border border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-medium">Seguidores</span>
                          <MetricExplanation metric={metrics.followers} variant="icon" />
                        </div>
                        <span className="text-base font-extrabold text-white font-mono mt-0.5 block">
                          {metrics.followers.formattedValue}
                        </span>
                      </div>

                      {/* Crecimiento */}
                      <div className="p-2.5 rounded-xl bg-[#141a1d] border border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            Crecimiento ({selectedPeriod})
                          </span>
                          <MetricExplanation metric={metrics.growth} variant="icon" />
                        </div>
                        <span
                          className={`text-base font-extrabold font-mono mt-0.5 block ${
                            metrics.growth.status === 'AVAILABLE'
                              ? Number(metrics.growth.value) > 0
                                ? 'text-[#53FC18]'
                                : Number(metrics.growth.value) < 0
                                ? 'text-rose-400'
                                : 'text-zinc-300'
                              : 'text-zinc-500 text-xs'
                          }`}
                        >
                          {metrics.growth.formattedValue}
                        </span>
                      </div>

                      {/* Audiencia Media */}
                      <div className="p-2.5 rounded-xl bg-[#141a1d] border border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-medium">Media Viewers</span>
                          <MetricExplanation metric={metrics.avgViewers} variant="icon" />
                        </div>
                        <span className="text-base font-extrabold text-white font-mono mt-0.5 block">
                          {metrics.avgViewers.formattedValue}
                        </span>
                      </div>

                      {/* Regularidad Observada */}
                      <div className="p-2.5 rounded-xl bg-[#141a1d] border border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-medium">Regularidad</span>
                          <MetricExplanation metric={metrics.regularity} variant="icon" />
                        </div>
                        <span className="text-xs font-bold text-sky-400 mt-1 block">
                          {metrics.regularity.formattedValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Provenance Transparency */}
                  {transparencyMode && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[10px] text-zinc-400 space-y-1 bg-black/20 p-2 rounded-lg">
                      <div className="flex justify-between">
                        <span>Fuente:</span>
                        <span className="text-zinc-300 font-medium">{streamer.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Muestra n:</span>
                        <span className="font-mono text-white">{snapshotsCount} capturas</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fórmula:</span>
                        <span className="font-mono text-emerald-400">growth_rate_v1</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CRECIMIENTO */}
      {/* ========================================================= */}
      {activeTab === 'crecimiento' && (
        <div className="mt-6 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#12181b]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Seguidores Base</th>
                  <th className="py-3 px-4">Seguidores Final</th>
                  <th className="py-3 px-4">Variación Neta</th>
                  <th className="py-3 px-4">Tasa Crecimiento ({selectedPeriod})</th>
                  <th className="py-3 px-4">Tendencia (Slope)</th>
                  <th className="py-3 px-4">Muestra n</th>
                  <th className="py-3 px-4 text-right">Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {analyzedStreamers.map(({ streamer, metrics, trend, snapshotsCount }) => {
                  return (
                    <tr key={streamer.id} className="hover:bg-[#161e22]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">@{streamer.username}</div>
                        <div className="text-[10px] text-zinc-500">{streamer.primaryCategory}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {snapshotsCount >= 2 ? formatNumber(metrics.growth.provenance.inputsUsed?.initialFollowers as number) : 'NO DISPONIBLE'}
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-semibold">
                        {metrics.followers.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {metrics.growthAbs.formattedValue}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                            metrics.growth.status === 'AVAILABLE'
                              ? Number(metrics.growth.value) > 0
                                ? 'bg-emerald-950/60 text-[#53FC18] border border-emerald-800/40'
                                : Number(metrics.growth.value) < 0
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                : 'bg-zinc-800 text-zinc-300'
                              : 'bg-zinc-800/60 text-zinc-500'
                          }`}
                        >
                          {metrics.growth.formattedValue}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-sky-400">
                        {trend.formattedSlope}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {snapshotsCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <MetricExplanation metric={metrics.growth} variant="button" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: AUDIENCIA */}
      {/* ========================================================= */}
      {activeTab === 'audiencia' && (
        <div className="mt-6 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#12181b]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Media Concurrente</th>
                  <th className="py-3 px-4">Mediana (Robusta)</th>
                  <th className="py-3 px-4">Pico Máximo Observado</th>
                  <th className="py-3 px-4">Ratio Viewers / Followers</th>
                  <th className="py-3 px-4">Muestra n</th>
                  <th className="py-3 px-4 text-right">Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {analyzedStreamers.map(({ streamer, metrics, snapshotsCount }) => {
                  return (
                    <tr key={streamer.id} className="hover:bg-[#161e22]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">@{streamer.username}</div>
                        <div className="text-[10px] text-zinc-500">{streamer.primaryCategory}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-semibold">
                        {metrics.avgViewers.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                        {metrics.medianViewers.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 font-semibold">
                        {metrics.peakViewers.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {metrics.ratio.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {snapshotsCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <MetricExplanation metric={metrics.ratio} variant="button" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ACTIVIDAD & REGULARIDAD */}
      {/* ========================================================= */}
      {activeTab === 'actividad' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#141a1d] border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Aclaración Metodológica de Regularidad:</span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                El <strong>Indicador de Regularidad Observada</strong> mide exclusivamente la estabilidad matemática de los intervalos de transmisión registrados en el calendario histórico. No constituye una valoración cualitativa o subjetiva de la calidad del creador.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#12181b]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold text-[11px]">
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Streams Observados</th>
                  <th className="py-3 px-4">Frecuencia Semanal</th>
                  <th className="py-3 px-4">Duración Promedio</th>
                  <th className="py-3 px-4">Regularidad Observada</th>
                  <th className="py-3 px-4 text-right">Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {analyzedStreamers.map(({ streamer, metrics }) => {
                  return (
                    <tr key={streamer.id} className="hover:bg-[#161e22]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">@{streamer.username}</div>
                        <div className="text-[10px] text-zinc-500">{streamer.primaryCategory}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        {metrics.streamCount.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {metrics.streamFreq.formattedValue}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {metrics.duration.formattedValue}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-xs ${
                            metrics.regularity.status === 'AVAILABLE'
                              ? 'bg-sky-950/60 text-sky-300 border border-sky-800/40'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {metrics.regularity.formattedValue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <MetricExplanation metric={metrics.regularity} variant="button" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CATEGORÍAS */}
      {/* ========================================================= */}
      {activeTab === 'categorias' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#141a1d] border border-zinc-800 text-xs text-zinc-400">
            <span className="font-bold text-white block mb-1">Muestra Disponible y Cobertura Conocida:</span>
            Los valores de audiencia y canales en cada categoría corresponden exclusivamente a los creadores monitoreados y verificados en la muestra de KICK Analytics MX. No representan la totalidad global de la plataforma KICK.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAnalysisResults.map((cat) => (
              <div key={cat.categoryName} className="p-4 rounded-2xl bg-[#12181b] border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-base">{cat.categoryName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141a1d] text-zinc-400 border border-zinc-800">
                      {cat.sampleCoverageLabel}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Canales conocidos en muestra:</span>
                      <span className="font-bold text-white font-mono">{cat.knownChannelsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Audiencia media concurrente:</span>
                      <span className="font-bold text-[#53FC18] font-mono">
                        {cat.averageAudience !== null ? `${cat.averageAudience} viewers` : 'NO DISPONIBLE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Mediana de audiencia:</span>
                      <span className="font-bold text-sky-400 font-mono">
                        {cat.medianAudience !== null ? `${cat.medianAudience} viewers` : 'NO DISPONIBLE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-zinc-400">Pico máximo observado:</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {cat.peakAudienceObserved !== null ? `${cat.peakAudienceObserved} viewers` : 'NO DISPONIBLE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top channels in sample */}
                {cat.topChannelsInSample.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800/80">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      Canales Principales en la Muestra
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.topChannelsInSample.map((c) => (
                        <span
                          key={c.username}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141a1d] text-zinc-300 border border-zinc-800"
                        >
                          @{c.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: ANOMALÍAS ESTADÍSTICAS */}
      {/* ========================================================= */}
      {activeTab === 'anomalias' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-1">
                Aclaración Estricta de Detección de Anomalías (MAD/IQR):
              </span>
              Una anomalía detectada significa exclusivamente que el valor observado se aparta matemáticamente de la distribución habitual de la muestra analizada. <strong>En ningún caso determina la causa ni infiere fraude, manipulación o conducta indebida.</strong>
            </div>
          </div>

          {allAnomalies.length === 0 ? (
            <div className="p-8 rounded-2xl border border-zinc-800 bg-[#12181b] text-center text-zinc-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-[#53FC18] mx-auto mb-2" />
              <p className="font-semibold text-white">No se detectaron desviaciones atípicas significativas</p>
              <p className="text-zinc-500 mt-1">Todas las observaciones históricas evaluadas se encuentran dentro del rango estadístico regular.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#12181b]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold text-[11px]">
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Métrica Evaluada</th>
                    <th className="py-3 px-4">Fecha de Observación</th>
                    <th className="py-3 px-4">Valor Observado</th>
                    <th className="py-3 px-4">Mediana Esperada</th>
                    <th className="py-3 px-4">Rango Habitual</th>
                    <th className="py-3 px-4">Desviación (MAD)</th>
                    <th className="py-3 px-4">Declaración Neutral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {allAnomalies.map((anom) => (
                    <tr key={anom.id} className="hover:bg-[#161e22]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        @{anom.streamerUsername}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {anom.metricName}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {anom.observedDate}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {anom.observedValue.toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {anom.expectedValue.toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        [{anom.expectedRange.min} - {anom.expectedRange.max}]
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-400 font-semibold">
                        {anom.deviationMagnitude}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-zinc-400 max-w-xs leading-relaxed italic">
                        {anom.neutralDisclaimer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: COMPARADOR MULTI-CANAL */}
      {/* ========================================================= */}
      {activeTab === 'comparador' && (
        <div className="mt-6 space-y-4">
          {/* Selector de canales a comparar */}
          <div className="p-4 rounded-2xl bg-[#12181b] border border-zinc-800">
            <span className="text-xs font-bold text-white block mb-2">
              Seleccionar Canales para Comparativa (Hasta 4 canales simultáneos):
            </span>
            <div className="flex flex-wrap gap-2">
              {streamers.map((s) => {
                const isSelected = comparisonSelection.includes(s.username);
                return (
                  <button
                    key={s.username}
                    onClick={() => toggleComparisonStreamer(s.username)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#53FC18] text-black font-bold'
                        : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <span>@{s.username}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {comparisonItems.length === 0 ? (
            <div className="p-8 rounded-2xl border border-zinc-800 bg-[#12181b] text-center text-zinc-400 text-xs">
              Seleccione al menos un canal para visualizar la tabla comparativa estructurada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#12181b]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold text-[11px]">
                    <th className="py-3 px-4 w-48">Métrica Analítica</th>
                    {comparisonItems.map((item) => (
                      <th key={item.streamer.username} className="py-3 px-4">
                        <div className="text-white font-bold text-sm">@{item.streamer.username}</div>
                        <div className="text-[10px] text-zinc-500 font-normal">
                          {item.coverageLabel}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {/* Fila: Seguidores */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Seguidores Actuales</div>
                      <span className="text-[10px] text-blue-400 font-bold uppercase">OBSERVADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono font-bold text-white">
                        {item.metrics.current_followers?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Crecimiento */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Crecimiento ({selectedPeriod})</div>
                      <span className="text-[10px] text-[#53FC18] font-bold uppercase">CALCULADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono font-bold text-[#53FC18]">
                        {item.metrics.follower_growth_percentage?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Media Viewers */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Audiencia Media</div>
                      <span className="text-[10px] text-[#53FC18] font-bold uppercase">CALCULADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono text-white">
                        {item.metrics.average_viewers?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Pico de Audiencia */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Pico de Audiencia</div>
                      <span className="text-[10px] text-blue-400 font-bold uppercase">OBSERVADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono text-amber-400">
                        {item.metrics.peak_viewers?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Ratio Viewers / Followers */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Ratio Viewers / Followers</div>
                      <span className="text-[10px] text-[#53FC18] font-bold uppercase">CALCULADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono text-zinc-300">
                        {item.metrics.viewer_follower_ratio?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Regularidad Observada */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Regularidad Observada</div>
                      <span className="text-[10px] text-[#53FC18] font-bold uppercase">CALCULADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono text-sky-400">
                        {item.metrics.activity_consistency?.formattedValue}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Data Quality Score */}
                  <tr className="hover:bg-[#161e22]/60">
                    <td className="py-3 px-4 font-semibold text-zinc-300">
                      <div>Data Quality Score</div>
                      <span className="text-[10px] text-[#53FC18] font-bold uppercase">CALCULADO</span>
                    </td>
                    {comparisonItems.map((item) => (
                      <td key={item.streamer.username} className="py-3 px-4 font-mono font-bold text-white">
                        {item.dataQualityScore} / 100
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: CATÁLOGO DE FÓRMULAS & METODOLOGÍA */}
      {/* ========================================================= */}
      {activeTab === 'catalogo' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#141a1d] border border-zinc-800 text-xs text-zinc-300">
            <span className="font-bold text-white block mb-1">Catálogo Formal de Definiciones y Fórmulas:</span>
            Cada métrica computada en KICK Analytics MX cuenta con especificación de fórmula, versión de algoritmo, tamaño mínimo de muestra y limitaciones de interpretación.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataService.analytics.registry.getAllDefinitions().map((def) => (
              <div key={def.id} className="p-4 rounded-2xl bg-[#12181b] border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-sm">{def.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        def.type === 'OBSERVADO'
                          ? 'bg-blue-950/70 text-blue-400 border border-blue-800/40'
                          : 'bg-emerald-950/70 text-[#53FC18] border border-emerald-800/40'
                      }`}
                    >
                      {def.type}
                    </span>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed mb-3">
                    {def.description}
                  </p>

                  <div className="space-y-1.5 text-[11px] bg-black/30 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="text-emerald-400 font-mono text-[11px] break-all">
                      Fórmula: {def.formula}
                    </div>
                    <div className="text-zinc-400 flex justify-between">
                      <span>Versión: <strong className="text-zinc-200">{def.formulaVersion}</strong></span>
                      <span>Muestra mínima: <strong className="text-zinc-200">n &ge; {def.minimumSampleSize}</strong></span>
                    </div>
                  </div>
                </div>

                {def.limitations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">
                      Limitaciones del Análisis
                    </span>
                    <ul className="text-[10px] text-zinc-400 list-disc list-inside space-y-0.5">
                      {def.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
