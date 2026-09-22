import React, { useState, useEffect } from 'react';
import {
  Users,
  Radio,
  UserCheck,
  Eye,
  Clock,
  Zap,
  Sparkles,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { AreaLineChart, HorizontalBarChart } from '../components/Charts';
import { dataService } from '../services/dataService';
import { Streamer, CategoryData } from '../types';
import { PageRoute } from '../components/Navigation';

interface DashboardPageProps {
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
  streamers: Streamer[];
  categories: CategoryData[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  streamers,
  categories,
}) => {
  const [loading, setLoading] = useState(false);
  const [aggregates, setAggregates] = useState<{
    registeredCount: number;
    activeCount: number;
    totalFollowers: number;
    platformAvgViewers: number;
    totalHours: number;
    peakPlatformAudience: number;
    newChannelsCount: number;
    recentActiveCount: number;
    updateDate: string;
  } | null>(null);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | 'historico'>('30d');

  useEffect(() => {
    const load = async () => {
      const agg = await dataService.getPlatformAggregates();
      setAggregates(agg);
    };
    load();
  }, [streamers]);

  const timeframeLabels: Record<string, string> = {
    '7d': 'Últimos 7 días (13 sep - 20 sep 2026)',
    '30d': 'Últimos 30 días (21 ago - 20 sep 2026)',
    '90d': 'Últimos 90 días (22 jun - 20 sep 2026)',
    'historico': 'Registro histórico disponible (2025 - 2026)',
  };

  // Evolution chart points based on timeframe
  const audiencePoints =
    selectedTimeframe === '7d'
      ? [
          { label: '14 Sep', value: 18200 },
          { label: '15 Sep', value: 38400 },
          { label: '16 Sep', value: 29500 },
          { label: '17 Sep', value: 22100 },
          { label: '18 Sep', value: 24600 },
          { label: '19 Sep', value: 27800 },
          { label: '20 Sep', value: 28450 },
        ]
      : selectedTimeframe === '30d'
      ? [
          { label: '21 Ago', value: 16500 },
          { label: '28 Ago', value: 19200 },
          { label: '04 Sep', value: 23100 },
          { label: '11 Sep', value: 26800 },
          { label: '15 Sep', value: 46800 },
          { label: '20 Sep', value: 28450 },
        ]
      : selectedTimeframe === '90d'
      ? [
          { label: 'Junio', value: 12400 },
          { label: 'Julio', value: 15800 },
          { label: 'Agosto', value: 21900 },
          { label: 'Septiembre', value: 28450 },
        ]
      : [
          { label: 'Q4 2025', value: 8900 },
          { label: 'Q1 2026', value: 14200 },
          { label: 'Q2 2026', value: 19800 },
          { label: 'Q3 2026', value: 28450 },
        ];

  const hoursPoints =
    selectedTimeframe === '7d'
      ? [
          { label: '14 Sep', value: 42 },
          { label: '15 Sep', value: 68 },
          { label: '16 Sep', value: 55 },
          { label: '17 Sep', value: 48 },
          { label: '18 Sep', value: 59 },
          { label: '19 Sep', value: 72 },
          { label: '20 Sep', value: 64 },
        ]
      : [
          { label: 'Semana 1', value: 320 },
          { label: 'Semana 2', value: 380 },
          { label: 'Semana 3', value: 415 },
          { label: 'Semana 4', value: 460 },
        ];

  const followersGrowthPoints = [
    { label: 'Mayo', value: 980000 },
    { label: 'Junio', value: 1140000 },
    { label: 'Julio', value: 1320000 },
    { label: 'Agosto', value: 1550000 },
    { label: 'Septiembre', value: aggregates?.totalFollowers || 1720000 },
  ];

  const activeChannelsHistory = [
    { label: 'Semana 1', value: 18 },
    { label: 'Semana 2', value: 21 },
    { label: 'Semana 3', value: 24 },
    { label: 'Semana 4', value: aggregates?.activeCount || 26 },
  ];

  const dailyActivityItems = [
    { label: 'Lunes', value: 145, sublabel: 'horas transmitidas' },
    { label: 'Martes', value: 162, sublabel: 'horas transmitidas' },
    { label: 'Miércoles', value: 178, sublabel: 'horas transmitidas' },
    { label: 'Jueves', value: 195, sublabel: 'horas transmitidas' },
    { label: 'Viernes', value: 284, sublabel: 'horas transmitidas' },
    { label: 'Sábado', value: 360, sublabel: 'horas transmitidas' },
    { label: 'Domingo', value: 310, sublabel: 'horas transmitidas' },
  ];

  const categoryShareItems = categories.slice(0, 6).map((c) => ({
    label: c.name,
    value: c.channelCount,
    sublabel: 'canales',
  }));

  return (
    <div id="dashboard-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">KICK MÉXICO</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              PANEL GENERAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#53FC18]" />
            <span>Fecha de actualización: </span>
            <strong className="text-slate-200">{aggregates?.updateDate || '20 de septiembre de 2026'}</strong>
          </p>
        </div>

        {/* Timeframe selector pill */}
        <div className="flex items-center gap-1.5 bg-[#121719] p-1 rounded-xl border border-zinc-800 overflow-x-auto text-xs">
          {(['7d', '30d', '90d', 'historico'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTimeframe(t)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedTimeframe === t
                  ? 'bg-[#1e2a22] text-[#53FC18] border border-[#53FC18]/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t === '7d' ? '7 días' : t === '30d' ? '30 días' : t === '90d' ? '90 días' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Essential Cards (Rule 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <MetricCard
          id="card-streamers-registrados"
          title="Streamers registrados"
          rawNumber={aggregates?.registeredCount || streamers.length}
          icon={<Users className="w-4 h-4 text-emerald-400" />}
          subtitle="Total de perfiles verificados"
        />

        <MetricCard
          id="card-canales-activos"
          title="Canales activos"
          rawNumber={aggregates?.activeCount || 0}
          icon={<Radio className="w-4 h-4 text-[#53FC18]" />}
          subtitle="Emisiones en los últimos 30 días"
        />

        <MetricCard
          id="card-seguidores-acumulados"
          title="Seguidores acumulados"
          rawNumber={aggregates?.totalFollowers || 0}
          icon={<UserCheck className="w-4 h-4 text-sky-400" />}
          subtitle="Suma de contadores observados"
        />

        <MetricCard
          id="card-viewers-promedio"
          title="Viewers promedio"
          rawNumber={aggregates?.platformAvgViewers || 0}
          icon={<Eye className="w-4 h-4 text-purple-400" />}
          subtitle="Promedio por sesión activa"
        />

        <MetricCard
          id="card-horas-transmitidas"
          title="Horas transmitidas"
          rawNumber={aggregates?.totalHours || 0}
          isHours={true}
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          subtitle="Horas observadas en el periodo"
        />

        <MetricCard
          id="card-pico-audiencia"
          title="Pico de audiencia"
          rawNumber={aggregates?.peakPlatformAudience || 0}
          icon={<Zap className="w-4 h-4 text-[#53FC18]" />}
          subtitle="Máxima concurrencia simultánea"
        />

        <MetricCard
          id="card-canales-nuevos"
          title="Canales nuevos"
          rawNumber={aggregates?.newChannelsCount || 0}
          icon={<Sparkles className="w-4 h-4 text-rose-400" />}
          subtitle="Registrados en los últimos 30 días"
        />

        <MetricCard
          id="card-actividad-reciente"
          title="Actividad reciente"
          rawNumber={aggregates?.recentActiveCount || 0}
          icon={<Activity className="w-4 h-4 text-cyan-400" />}
          subtitle="Directo en los últimos 7 días"
        />
      </div>

      {/* 6 Analytical Graphs (Rule 5) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Gráficas del Ecosistema KICK México</h2>
            <p className="text-xs text-slate-400">
              Indicador de periodo activo: <strong className="text-slate-300">{timeframeLabels[selectedTimeframe]}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Evolución de audiencia */}
          <AreaLineChart
            id="chart-evolucion-audiencia"
            title="1. Evolución de audiencia concurrente"
            periodText={timeframeLabels[selectedTimeframe]}
            data={audiencePoints}
            unit="viewers"
            color="#53FC18"
            height={220}
          />

          {/* 2. Horas transmitidas */}
          <AreaLineChart
            id="chart-horas-transmitidas"
            title="2. Horas transmitidas acumuladas"
            periodText={timeframeLabels[selectedTimeframe]}
            data={hoursPoints}
            unit="horas"
            color="#38bdf8"
            height={220}
          />

          {/* 3. Crecimiento de seguidores */}
          <AreaLineChart
            id="chart-crecimiento-seguidores"
            title="3. Crecimiento de seguidores del ecosistema"
            periodText="Observación mensual acumulada (2026)"
            data={followersGrowthPoints}
            unit="seguidores"
            color="#a855f7"
            height={220}
          />

          {/* 4. Canales activos */}
          <AreaLineChart
            id="chart-canales-activos"
            title="4. Evolución de canales con transmisión activa"
            periodText="Últimas 4 semanas observadas"
            data={activeChannelsHistory}
            unit="canales"
            color="#f59e0b"
            height={220}
          />

          {/* 5. Distribución por categoría */}
          <HorizontalBarChart
            id="chart-distribucion-categoria"
            title="5. Distribución de canales por categoría"
            periodText="Septiembre 2026"
            items={categoryShareItems}
            barColor="#53FC18"
          />

          {/* 6. Actividad por día */}
          <HorizontalBarChart
            id="chart-actividad-por-dia"
            title="6. Actividad de transmisiones por día de la semana"
            periodText="Agregado últimas 4 semanas"
            items={dailyActivityItems}
            barColor="#38bdf8"
          />
        </div>
      </div>
    </div>
  );
};
