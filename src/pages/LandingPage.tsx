import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  MapPin,
  CheckCircle,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { PageRoute } from '../components/Navigation';
import { Streamer, CategoryData } from '../types';
import { formatCompactNumber } from '../utils/formatters';

interface LandingPageProps {
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
  streamers: Streamer[];
  categories: CategoryData[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  streamers,
  categories,
}) => {
  const topStreamers = [...streamers]
    .sort((a, b) => (b.followers.value || 0) - (a.followers.value || 0))
    .slice(0, 4);

  return (
    <div id="landing-page" className="w-full pb-20 md:pb-12 animate-in fade-in duration-200">
      {/* Hero Section */}
      <section className="relative px-4 py-12 md:py-20 max-w-6xl mx-auto text-center border-b border-zinc-800/80">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131d16] border border-[#53FC18]/40 text-[#53FC18] text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-[#53FC18] animate-pulse" />
          <span>Inteligencia y Métricas de KICK México</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          KICK ANALYTICS <span className="text-[#53FC18]">MX</span>
        </h1>

        <p className="mt-4 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Datos públicos para entender el ecosistema mexicano de KICK.
        </p>

        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Análisis objetivo de canales, métricas de audiencia verificadas, evolución histórica y detección de canales emergentes sin especulación.
        </p>

        {/* Action CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => onNavigate('streamers')}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(83,252,24,0.25)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            Explorar streamers
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#141a1d] hover:bg-[#1b2327] text-white font-semibold text-sm rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-[#53FC18]" />
            Ver dashboard
          </button>

          <button
            onClick={() => onNavigate('mexico')}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#141a1d] hover:bg-[#1b2327] text-white font-semibold text-sm rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-[#53FC18]" />
            Analizar KICK México
          </button>
        </div>

        {/* Core Principles badges */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3 bg-[#111619] border border-zinc-800 rounded-lg">
            <div className="text-[#53FC18] text-xs font-semibold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" />
              Cero Datos Falsos
            </div>
            <p className="text-[11px] text-slate-400">Si un dato no existe, se muestra explícitamente como No Disponible.</p>
          </div>

          <div className="p-3 bg-[#111619] border border-zinc-800 rounded-lg">
            <div className="text-[#53FC18] text-xs font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-4 h-4" />
              Trazabilidad Total
            </div>
            <p className="text-[11px] text-slate-400">Cada métrica guarda fecha de captura, periodo y fuente oficial observada.</p>
          </div>

          <div className="p-3 bg-[#111619] border border-zinc-800 rounded-lg">
            <div className="text-[#53FC18] text-xs font-semibold flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4" />
              Métricas Objetivas
            </div>
            <p className="text-[11px] text-slate-400">Indicadores matemáticos rigurosos sin juicios de valor ni opiniones.</p>
          </div>

          <div className="p-3 bg-[#111619] border border-zinc-800 rounded-lg">
            <div className="text-[#53FC18] text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4" />
              Adaptabilidad Móvil
            </div>
            <p className="text-[11px] text-slate-400">Diseñado desde la base para Android y navegación táctil ágil.</p>
          </div>
        </div>
      </section>

      {/* Featured Streamers Section */}
      <section className="px-4 py-12 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Canales Observados en México</h2>
            <p className="text-xs text-slate-400 mt-0.5">Muestra de canales con actividad en el ecosistema nacional.</p>
          </div>
          <button
            onClick={() => onNavigate('streamers')}
            className="text-xs font-semibold text-[#53FC18] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver todos ({streamers.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topStreamers.map((s) => (
            <div
              key={s.id}
              onClick={() => onNavigate('streamer_detail', { username: s.username })}
              className="bg-[#111619] border border-zinc-800 hover:border-[#53FC18]/50 p-4 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={s.avatarUrl}
                  alt={s.displayName}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700 group-hover:border-[#53FC18] transition-colors"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white group-hover:text-[#53FC18] transition-colors truncate">
                    {s.displayName}
                  </div>
                  <div className="font-mono text-xs text-zinc-400">@{s.username}</div>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] rounded bg-zinc-800 text-zinc-300">
                    {s.primaryCategory}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Seguidores</span>
                  <span className="font-mono font-bold text-white">
                    {formatCompactNumber(s.followers.value)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Avg Viewers</span>
                  <span className="font-mono font-bold text-[#53FC18]">
                    {formatCompactNumber(s.avgViewers.value)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Snapshot Section */}
      <section className="px-4 py-10 max-w-6xl mx-auto border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Distribución por Categorías</h2>
            <p className="text-xs text-slate-400 mt-0.5">Monitoreo de géneros de contenido en KICK México.</p>
          </div>
          <button
            onClick={() => onNavigate('categorias')}
            className="text-xs font-semibold text-[#53FC18] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver categorías <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.slice(0, 6).map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigate('categorias')}
              className="bg-[#111619] border border-zinc-800/90 hover:border-zinc-700 p-3 rounded-xl cursor-pointer text-center"
            >
              <span className="text-xs font-bold text-white block truncate">{c.name}</span>
              <span className="text-lg font-mono font-bold text-[#53FC18] block mt-1">{c.channelCount}</span>
              <span className="text-[10px] text-zinc-500 block">canales activos</span>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology Section Teaser */}
      <section className="px-4 py-12 max-w-4xl mx-auto text-center border-t border-zinc-800/80">
        <div className="bg-[#101518] border border-zinc-800 rounded-2xl p-6 sm:p-8 text-left">
          <div className="flex items-center gap-2 text-[#53FC18] text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4" />
            Transparencia y Metodología
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            ¿Cómo se recolectan y verifican los datos en KICK Analytics MX?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Las métricas de KICK cambian constantemente. Los valores mostrados representan datos observados durante el periodo indicado y pueden cambiar posteriormente. Nuestra política prohíbe inventar cifras o hacer inferencias subjetivas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('metodologia')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              Consultar metodología completa <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('reportes')}
              className="px-4 py-2 bg-[#18231d] hover:bg-[#1e2e26] text-[#53FC18] border border-[#53FC18]/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Generar reporte oficial
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
