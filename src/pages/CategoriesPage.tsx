import React, { useState } from 'react';
import {
  Grid3X3,
  Users,
  Eye,
  Clock,
  Zap,
  Radio,
  ArrowUpDown,
  BarChart2,
} from 'lucide-react';
import { CategoryData } from '../types';
import {
  formatCompactNumber,
  formatNumber,
  formatHours,
  getCategoryBadgeColor,
} from '../utils/formatters';
import { HorizontalBarChart } from '../components/Charts';
import { PageRoute } from '../components/Navigation';

interface CategoriesPageProps {
  categories: CategoryData[];
  onNavigate: (route: PageRoute) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  onNavigate,
}) => {
  const [sortField, setSortField] = useState<'channelCount' | 'avgViewers' | 'totalHours' | 'totalFollowers'>('channelCount');

  const sortedCategories = [...categories].sort((a, b) => b[sortField] - a[sortField]);

  const chartChannelsData = sortedCategories.map((c) => ({
    label: c.name,
    value: c.channelCount,
    sublabel: 'canales',
  }));

  const chartViewersData = [...categories]
    .sort((a, b) => b.avgViewers - a.avgViewers)
    .map((c) => ({
      label: c.name,
      value: c.avgViewers,
      sublabel: 'viewers promedio',
    }));

  return (
    <div id="categories-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Análisis de Categorías
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              11 GÉNEROS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de distribución de contenido y audiencias en KICK México.
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Ordenar por:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-[#111619] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#53FC18]/50"
          >
            <option value="channelCount">Número de canales</option>
            <option value="avgViewers">Espectadores promedio</option>
            <option value="totalHours">Horas transmitidas</option>
            <option value="totalFollowers">Seguidores acumulados</option>
          </select>
        </div>
      </div>

      {/* Comparative Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <HorizontalBarChart
          id="chart-categories-channels"
          title="Distribución de canales por categoría"
          periodText="Septiembre 2026"
          items={chartChannelsData}
          barColor="#53FC18"
        />

        <HorizontalBarChart
          id="chart-categories-viewers"
          title="Audiencia promedio por categoría"
          periodText="Sesiones observadas (últimos 30 días)"
          items={chartViewersData}
          barColor="#38bdf8"
        />
      </div>

      {/* Detailed Categories Cards Grid (11 Categories) */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white tracking-tight mb-4">
          Fichas Comparativas por Categoría
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCategories.map((c) => (
            <div
              key={c.id}
              className="bg-[#111619] border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getCategoryBadgeColor(c.name)}`}>
                    {c.name}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#53FC18]" />
                    {c.activeChannels} activos
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{c.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-zinc-800/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] font-sans text-zinc-500 block">Canales</span>
                  <span className="font-bold text-white">{c.channelCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-zinc-500 block">Avg viewers</span>
                  <span className="font-bold text-[#53FC18]">{formatNumber(c.avgViewers)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-zinc-500 block">Horas transmitidas</span>
                  <span className="text-zinc-300">{formatHours(c.totalHours)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-zinc-500 block">Pico máximo</span>
                  <span className="text-zinc-300">{formatNumber(c.peakViewers)}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-zinc-800/40 flex justify-between items-center text-[11px]">
                  <span className="font-sans text-zinc-500">Seguidores acumulados</span>
                  <span className="text-white font-bold">{formatCompactNumber(c.totalFollowers)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
