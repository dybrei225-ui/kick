import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Eye,
  Users,
  Radio,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Streamer, GrowthIndicator } from '../types';
import {
  formatCompactNumber,
  formatNumber,
  formatHours,
  getCategoryBadgeColor,
} from '../utils/formatters';
import { PageRoute } from '../components/Navigation';

interface EmergentPageProps {
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

type MetricCriterion = 'followers_growth' | 'viewers_growth' | 'hours_streamed' | 'avg_viewers' | 'streams_growth';

export const EmergentPage: React.FC<EmergentPageProps> = ({ onNavigate }) => {
  const [criterion, setCriterion] = useState<MetricCriterion>('followers_growth');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<
    {
      streamer: Streamer;
      followerGrowth: GrowthIndicator;
      viewerGrowth: GrowthIndicator;
      hoursGrowth: GrowthIndicator;
      streamsGrowth: GrowthIndicator;
      hours: number;
      avgViewers: number;
      peakViewers: number;
    }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await dataService.getEmergentRankings(criterion, selectedPeriod);
      setRankings(data);
      setLoading(false);
    };
    load();
  }, [criterion, selectedPeriod]);

  const criteriaConfig: Record<
    MetricCriterion,
    { title: string; subtitle: string; metricName: string; icon: React.ReactNode }
  > = {
    followers_growth: {
      title: 'Crecimiento de seguidores (%)',
      subtitle: 'Ordenado estrictamente por incremento porcentual de seguidores observados.',
      metricName: 'Variación de seguidores',
      icon: <Users className="w-4 h-4 text-[#53FC18]" />,
    },
    viewers_growth: {
      title: 'Crecimiento de audiencia promedio (%)',
      subtitle: 'Ordenado por variación porcentual de espectadores promedio entre periodos.',
      metricName: 'Variación de audiencia',
      icon: <Eye className="w-4 h-4 text-sky-400" />,
    },
    streams_growth: {
      title: 'Crecimiento de transmisiones (%)',
      subtitle: 'Ordenado por variación en la frecuencia de streams emitidos.',
      metricName: 'Variación de directos',
      icon: <Radio className="w-4 h-4 text-pink-400" />,
    },
    hours_streamed: {
      title: 'Volumen de horas transmitidas',
      subtitle: 'Ordenado por horas totales en directo durante el periodo de observación.',
      metricName: 'Horas acumuladas',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    },
    avg_viewers: {
      title: 'Audiencia concurrente promedio',
      subtitle: 'Ordenado por media aritmética de espectadores en sesiones observadas.',
      metricName: 'Espectadores promedio',
      icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
    },
  };

  const activeConfig = criteriaConfig[criterion];

  const getTrendBadge = (growth: GrowthIndicator, label: string) => {
    let colorClass = 'text-zinc-400 bg-zinc-800/60 border-zinc-700/60';
    if (growth.trend === 'positive') {
      colorClass = 'text-[#53FC18] bg-[#53FC18]/10 border-[#53FC18]/30';
    } else if (growth.trend === 'negative') {
      colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }

    return (
      <div className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-1.5 ${colorClass}`}>
        <span className="text-[10px] text-zinc-400 font-sans">{label}:</span>
        <span className="font-bold">{growth.displayText}</span>
      </div>
    );
  };

  return (
    <div id="emergentes-page" className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Title & Philosophy Header */}
      <div className="pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#53FC18]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Detector de Canales Emergentes
          </h1>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Ordenamiento riguroso basado <strong>exclusivamente en cálculos matemáticos de variación porcentual</strong>. La plataforma no emite opiniones subjetivas, calificaciones de gusto ni declara &quot;mejores o peores streamers&quot;.
        </p>

        {/* Objective notice */}
        <div className="mt-4 p-3 bg-[#111714] border border-[#53FC18]/30 rounded-xl flex items-start gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#53FC18] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Cálculo matemático:</strong> Las variaciones se obtienen mediante la fórmula clásica:{' '}
            <code className="text-[#53FC18] bg-black/50 px-1.5 py-0.5 rounded font-mono text-[11px]">
              ((valorActual - valorAnterior) / |valorAnterior|) × 100
            </code>.
          </div>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Criterion Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(
            [
              'followers_growth',
              'viewers_growth',
              'streams_growth',
              'hours_streamed',
              'avg_viewers',
            ] as MetricCriterion[]
          ).map((crit) => {
            const cfg = criteriaConfig[crit];
            const isSelected = criterion === crit;
            return (
              <button
                key={crit}
                onClick={() => setCriterion(crit)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/50 shadow-[0_0_10px_rgba(83,252,24,0.15)]'
                    : 'bg-[#111619] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cfg.icon}
                <span>{cfg.title}</span>
              </button>
            );
          })}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-[#12171a] p-1 rounded-xl border border-zinc-800 self-start md:self-auto text-xs">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 ml-2" />
          <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">Periodo:</span>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                selectedPeriod === period
                  ? 'bg-[#1e2a22] text-[#53FC18] border border-[#53FC18]/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {period === '7d' ? '7 días' : period === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Active Criterion Details Banner */}
      <div className="mt-4 bg-[#111619] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {activeConfig.icon}
            {activeConfig.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{activeConfig.subtitle}</p>
        </div>
        <span className="text-xs font-mono text-[#53FC18] bg-[#53FC18]/10 border border-[#53FC18]/30 px-2.5 py-1 rounded-lg self-start sm:self-auto flex-shrink-0">
          Evaluando periodo: Últimos {selectedPeriod}
        </span>
      </div>

      {/* Ranked Streamers List with 4 Mathematical Growth Metrics */}
      {loading ? (
        <div className="py-16 text-center text-zinc-400 text-xs">
          <div className="animate-spin w-8 h-8 border-2 border-[#53FC18] border-t-transparent rounded-full mx-auto mb-3" />
          Calculando ordenamiento objetivo...
        </div>
      ) : rankings.length === 0 ? (
        <div className="mt-6 p-8 bg-[#111619] border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
          No hay datos suficientes para calcular este ordenamiento.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rankings.map((item, index) => {
            const position = index + 1;
            const streamer = item.streamer;

            return (
              <div
                key={streamer.id}
                onClick={() => onNavigate('streamer_detail', { username: streamer.username })}
                className="bg-[#111619] border border-zinc-800 hover:border-[#53FC18]/50 rounded-2xl p-4 cursor-pointer transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                {/* Position & Channel details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#141a1d] border border-zinc-800 flex items-center justify-center font-mono font-extrabold text-xs text-zinc-400 group-hover:text-[#53FC18] group-hover:border-[#53FC18]/40 transition-colors flex-shrink-0">
                    #{position}
                  </div>

                  <img
                    src={streamer.avatarUrl}
                    alt={streamer.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-zinc-700 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white group-hover:text-[#53FC18] transition-colors truncate">
                        {streamer.displayName}
                      </span>
                      <span className="font-mono text-xs text-zinc-400">@{streamer.username}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] ${getCategoryBadgeColor(streamer.primaryCategory)}`}>
                        {streamer.primaryCategory}
                      </span>
                      {streamer.state && <span>{streamer.state}</span>}
                      <span className="text-zinc-500">•</span>
                      <span className="font-mono text-zinc-300">
                        {formatCompactNumber(streamer.followers.value)} seguidores
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mathematical Growth Grid (Requirement 6) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
                  {getTrendBadge(item.followerGrowth, 'Seguidores')}
                  {getTrendBadge(item.viewerGrowth, 'Audiencia')}
                  {getTrendBadge(item.hoursGrowth, 'Horas')}
                  {getTrendBadge(item.streamsGrowth, 'Directos')}
                </div>

                {/* Arrow Action */}
                <div className="hidden lg:flex items-center justify-end pl-2">
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#53FC18] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
