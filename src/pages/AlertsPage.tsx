import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Zap,
  TrendingUp,
  Clock,
  Radio,
  Info,
  ExternalLink,
  Filter,
  CheckCircle2,
  Database,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { SystemAlert, AlertCategory, AlertSeverity } from '../types';
import { dataService } from '../services/dataService';
import { formatDate } from '../utils/formatters';
import { PageRoute } from '../components/Navigation';

interface AlertsPageProps {
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigate }) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'TODAS'>('TODAS');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'TODAS'>('TODAS');

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      const systemAlerts = await dataService.getSystemAlerts();
      setAlerts(systemAlerts);
      setLoading(false);
    };
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter((a) => {
    const matchCat = categoryFilter === 'TODAS' || a.category === categoryFilter;
    const matchSev = severityFilter === 'TODAS' || a.severity === severityFilter;
    return matchCat && matchSev;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'INFO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            INFO
          </span>
        );
      case 'CAMBIO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-[#53FC18] border border-emerald-500/30">
            CAMBIO
          </span>
        );
      case 'ADVERTENCIA':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            ADVERTENCIA
          </span>
        );
      case 'DATOS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            DATOS
          </span>
        );
    }
  };

  const getCategoryBadge = (category: AlertCategory) => {
    switch (category) {
      case 'CRECIMIENTO':
        return <span className="text-[11px] font-medium text-emerald-400">CRECIMIENTO</span>;
      case 'AUDIENCIA':
        return <span className="text-[11px] font-medium text-sky-400">AUDIENCIA</span>;
      case 'ACTIVIDAD':
        return <span className="text-[11px] font-medium text-amber-400">ACTIVIDAD</span>;
      case 'DATOS':
        return <span className="text-[11px] font-medium text-purple-400">DATOS</span>;
    }
  };

  const getAlertIcon = (category: AlertCategory) => {
    switch (category) {
      case 'CRECIMIENTO':
        return <TrendingUp className="w-5 h-5 text-[#53FC18]" />;
      case 'AUDIENCIA':
        return <Zap className="w-5 h-5 text-sky-400" />;
      case 'ACTIVIDAD':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'DATOS':
        return <Database className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div id="alerts-page" className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-6 h-6 text-[#53FC18]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sistema de Alertas del Ecosistema
          </h1>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Detección estadística automática de anomalías cuantitativas, récords de concurrencia, variaciones de actividad y vigencia de auditorías en canales de Kick México.
        </p>

        {/* Technical Rigor Notice (Requirement 13 & 15) */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#12171a] border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white block">Criterio Técnico & Objetividad:</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              El detector estadístico señala estrictamente <em>&quot;Cambio detectado&quot;</em> con base en diferencias observables entre capturas. No afirma causas hipotéticas ni emite juicios sensacionalistas. Clasificación técnica sobria: INFO, CAMBIO, ADVERTENCIA, DATOS.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101417] p-3.5 rounded-xl border border-zinc-800">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Categoría:</span>
          {(['TODAS', 'CRECIMIENTO', 'AUDIENCIA', 'ACTIVIDAD', 'DATOS'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#18231c] text-[#53FC18] border border-[#53FC18]/50'
                  : 'text-zinc-400 hover:text-white bg-[#141a1d] border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Severidad:</span>
          {(['TODAS', 'INFO', 'CAMBIO', 'ADVERTENCIA', 'DATOS'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                severityFilter === sev
                  ? 'bg-white/10 text-white border border-zinc-400'
                  : 'text-zinc-400 hover:text-white bg-[#141a1d] border border-zinc-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Count & Results */}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>Mostrando {filteredAlerts.length} de {alerts.length} alertas registradas</span>
      </div>

      {/* Alerts Grid / List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-16 text-center text-zinc-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#53FC18] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs">Escaneando anomalías históricas...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-16 text-center bg-[#111619] border border-zinc-800 rounded-xl p-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-white">Sin alertas para los filtros seleccionados</h3>
            <p className="text-xs text-zinc-400 mt-1">No se detectaron anomalías que coincidan con estos parámetros.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-[#111619] border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-4 sm:p-5 transition-all flex flex-col gap-3"
            >
              {/* Top Row: Category, Severity, Streamer, Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1.5 rounded-lg bg-[#151c20] border border-zinc-800">
                    {getAlertIcon(alert.category)}
                  </div>
                  {getCategoryBadge(alert.category)}
                  <span className="text-zinc-600">•</span>
                  {getSeverityBadge(alert.severity)}
                  <span className="text-zinc-600">•</span>
                  <button
                    onClick={() => onNavigate('streamer_detail', { username: alert.streamerUsername })}
                    className="font-bold text-sm text-white hover:text-[#53FC18] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{alert.streamerDisplayName}</span>
                    <span className="text-xs text-zinc-400 font-mono">(@{alert.streamerUsername})</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono self-start sm:self-auto">
                  Fecha: {formatDate(alert.date)}
                </div>
              </div>

              {/* Middle Row: Description */}
              <p className="text-xs text-zinc-200 leading-relaxed">
                {alert.description}
              </p>

              {/* Bottom Row: Metric Cards & Traceability (Requirement 14) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <div className="bg-[#141a1d] p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block">Métrica Evaluada</span>
                  <span className="font-semibold text-white truncate block">{alert.metric}</span>
                </div>

                <div className="bg-[#141a1d] p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block">Valor Anterior</span>
                  <span className="font-semibold text-zinc-300 truncate block">
                    {alert.previousValue !== null ? String(alert.previousValue) : 'N/A'}
                  </span>
                </div>

                <div className="bg-[#141a1d] p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block">Valor Actual</span>
                  <span className="font-semibold text-white truncate block">
                    {alert.currentValue !== null ? String(alert.currentValue) : 'N/A'}
                  </span>
                </div>

                <div className="bg-[#141a1d] p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 block">Variación Observada</span>
                  <span className="font-bold text-[#53FC18] truncate block">
                    {alert.variation}
                  </span>
                </div>
              </div>

              {/* Source & Traceability footnote */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-900">
                <span className="truncate">Fuente: {alert.source}</span>
                {alert.isDemo && (
                  <span className="text-purple-400 font-mono text-[10px]">Demostrativo</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
