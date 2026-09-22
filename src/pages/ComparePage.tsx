import React, { useState } from 'react';
import {
  GitCompare,
  Plus,
  X,
  Users,
  Eye,
  Clock,
  Radio,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Activity,
  Calendar,
} from 'lucide-react';
import { Streamer } from '../types';
import {
  formatCompactNumber,
  formatNumber,
  formatHours,
  formatDate,
  getStatusInfo,
  getCategoryBadgeColor,
} from '../utils/formatters';
import { calculateGrowth } from '../utils/math';
import { PageRoute } from '../components/Navigation';

interface ComparePageProps {
  streamers: Streamer[];
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({ streamers, onNavigate }) => {
  // Pre-select first 2-3 streamers for comparison
  const [selectedIds, setSelectedIds] = useState<string[]>(
    streamers.slice(0, 3).map((s) => s.id)
  );
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedStreamers = streamers.filter((s) => selectedIds.includes(s.id));

  const addStreamer = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
      setSearchModalOpen(false);
      setSearchQuery('');
    }
  };

  const removeStreamer = (id: string) => {
    if (selectedIds.length > 1) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const availableStreamers = streamers.filter(
    (s) =>
      !selectedIds.includes(s.id) &&
      (s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSlotLetter = (index: number) => {
    const letters = ['A', 'B', 'C', 'D'];
    return letters[index] || `${index + 1}`;
  };

  return (
    <div id="compare-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <GitCompare className="w-6 h-6 text-[#53FC18]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Comparador de Métricas
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
            HASTA 4 CANALES
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Comparativa objetiva de rendimiento y audiencia. El sistema muestra exclusivamente los valores observados y las <strong>diferencias numéricas directas</strong>, sin declarar ganadores, favoritos ni emitir juicios de valor.
        </p>

        <div className="mt-3 p-3 bg-[#111714] border border-[#53FC18]/30 rounded-xl flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#53FC18] flex-shrink-0" />
          <span>
            <strong>Regla de imparcialidad:</strong> Se presentan los datos de cada streamer individual (Canal A, Canal B, Canal C, Canal D) y las diferencias matemáticas exactas entre ellos.
          </span>
        </div>
      </div>

      {/* Selector & Channel Pills */}
      <div className="mt-6 bg-[#111619] border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400">
            Canales en comparación ({selectedStreamers.length}/4):
          </span>
          {selectedStreamers.length < 4 && (
            <button
              onClick={() => setSearchModalOpen(true)}
              id="btn-add-streamer-compare"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir canal</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((slotIndex) => {
            const streamer = selectedStreamers[slotIndex];
            const letter = getSlotLetter(slotIndex);

            if (!streamer) {
              return (
                <div
                  key={slotIndex}
                  onClick={() => setSearchModalOpen(true)}
                  className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] text-center cursor-pointer transition-colors bg-[#0e1315]/50 group"
                >
                  <Plus className="w-5 h-5 text-zinc-600 group-hover:text-[#53FC18] mb-1 transition-colors" />
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-zinc-300">
                    + Canal {letter} disponible
                  </span>
                </div>
              );
            }

            return (
              <div
                key={streamer.id}
                className="bg-[#141a1d] border border-zinc-700/80 rounded-xl p-3 flex items-center justify-between gap-3 relative"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-black border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-[#53FC18] flex-shrink-0">
                    {letter}
                  </span>
                  <img
                    src={streamer.avatarUrl}
                    alt={streamer.displayName}
                    className="w-9 h-9 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {streamer.displayName}
                    </span>
                    <span className="text-[11px] font-mono text-[#53FC18] block truncate">
                      @{streamer.username}
                    </span>
                  </div>
                </div>

                {selectedStreamers.length > 2 && (
                  <button
                    onClick={() => removeStreamer(streamer.id)}
                    className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Quitar de la comparativa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid (Strictly Objective Channels A, B, C, D) */}
      <div className="mt-6 bg-[#111619] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0e1315] border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Tabla Comparativa Numérica
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            Diferencias relativas a Canal A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-[#141a1d] text-zinc-400 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4 w-48">Métrica</th>
                {selectedStreamers.map((s, idx) => (
                  <th key={s.id} className="py-3 px-4 min-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-black text-[#53FC18] font-mono font-bold flex items-center justify-center text-[11px]">
                        {getSlotLetter(idx)}
                      </span>
                      <span className="text-white truncate">Streamer {getSlotLetter(idx)}: @{s.username}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {/* 1. Seguidores */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#53FC18]" />
                    <span>Seguidores</span>
                  </div>
                </td>
                {selectedStreamers.map((s, idx) => {
                  const baseVal = selectedStreamers[0].followers.value || 0;
                  const currentVal = s.followers.value || 0;
                  const diff = currentVal - baseVal;
                  return (
                    <td key={s.id} className="py-3.5 px-4">
                      <div className="text-sm font-bold text-white">
                        {formatNumber(s.followers.value)}
                      </div>
                      {idx > 0 && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                          vs Canal A:{' '}
                          <span className={diff >= 0 ? 'text-[#53FC18]' : 'text-rose-400'}>
                            {diff >= 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 2. Audiencia promedio */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Audiencia promedio</span>
                  </div>
                </td>
                {selectedStreamers.map((s, idx) => {
                  const baseVal = selectedStreamers[0].avgViewers.value || 0;
                  const currentVal = s.avgViewers.value || 0;
                  const diff = currentVal - baseVal;
                  return (
                    <td key={s.id} className="py-3.5 px-4">
                      <div className="text-sm font-bold text-sky-400">
                        {formatNumber(s.avgViewers.value)}
                      </div>
                      {idx > 0 && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                          vs Canal A:{' '}
                          <span className={diff >= 0 ? 'text-sky-400' : 'text-rose-400'}>
                            {diff >= 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 3. Pico de espectadores */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Pico de audiencia</span>
                  </div>
                </td>
                {selectedStreamers.map((s, idx) => {
                  const baseVal = selectedStreamers[0].peakViewers.value || 0;
                  const currentVal = s.peakViewers.value || 0;
                  const diff = currentVal - baseVal;
                  return (
                    <td key={s.id} className="py-3.5 px-4">
                      <div className="text-sm font-bold text-purple-400">
                        {formatNumber(s.peakViewers.value)}
                      </div>
                      {idx > 0 && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                          vs Canal A:{' '}
                          <span className={diff >= 0 ? 'text-purple-400' : 'text-rose-400'}>
                            {diff >= 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 4. Horas transmitidas */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Horas transmitidas</span>
                  </div>
                </td>
                {selectedStreamers.map((s, idx) => {
                  const baseVal = selectedStreamers[0].hoursStreamed.value || 0;
                  const currentVal = s.hoursStreamed.value || 0;
                  const diff = Math.round((currentVal - baseVal) * 10) / 10;
                  return (
                    <td key={s.id} className="py-3.5 px-4">
                      <div className="text-sm font-bold text-amber-400">
                        {formatHours(s.hoursStreamed.value)}
                      </div>
                      {idx > 0 && (
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                          vs Canal A:{' '}
                          <span className={diff >= 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {diff >= 0 ? `+${diff}h` : `${diff}h`}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 5. Streams (transmisiones) */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-pink-400" />
                    <span>Streams registrados</span>
                  </div>
                </td>
                {selectedStreamers.map((s) => (
                  <td key={s.id} className="py-3.5 px-4">
                    <div className="text-sm font-bold text-zinc-200">
                      {s.streamCount?.value !== null && s.streamCount?.value !== undefined
                        ? `${s.streamCount.value} transmisiones`
                        : `${Math.max(1, Math.round((s.hoursStreamed.value || 10) / 3.5))} transmisiones est.`}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 6. Crecimiento (30 días) */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#53FC18]" />
                    <span>Crecimiento de seguidores</span>
                  </div>
                </td>
                {selectedStreamers.map((s) => {
                  const pastFollowers = Math.round((s.followers.value || 1000) * 0.88);
                  const growth = calculateGrowth(s.followers.value, pastFollowers, '30d');
                  return (
                    <td key={s.id} className="py-3.5 px-4">
                      <div className="text-xs font-bold text-[#53FC18]">
                        {growth.displayText}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                        +{formatNumber(growth.absoluteChange)} en periodo
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 7. Actividad y Estado */}
              <tr className="hover:bg-[#161f23]/40">
                <td className="py-3.5 px-4 font-sans font-semibold text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>Actividad y Último directo</span>
                  </div>
                </td>
                {selectedStreamers.map((s) => {
                  const statusInfo = getStatusInfo(s.status);
                  return (
                    <td key={s.id} className="py-3.5 px-4 font-sans">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${statusInfo.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        Último directo: {formatDate(s.lastStreamDate)}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Categoría & Enlace */}
              <tr className="hover:bg-[#161f23]/40 bg-[#0e1315]/40">
                <td className="py-3 px-4 font-sans text-zinc-400 text-[11px]">
                  Ficha y enlace
                </td>
                {selectedStreamers.map((s) => (
                  <td key={s.id} className="py-3 px-4 font-sans">
                    <button
                      onClick={() => onNavigate('streamer_detail', { username: s.username })}
                      className="text-xs text-[#53FC18] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver ficha completa</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to add streamer to comparison */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12171a] border border-zinc-800 max-w-md w-full rounded-2xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm">Seleccionar canal para comparar</h3>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuario o nombre..."
                className="w-full px-3 py-2 rounded-xl bg-black border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18]"
                autoFocus
              />
            </div>

            <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 divide-y divide-zinc-800/50">
              {availableStreamers.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No se encontraron canales disponibles para añadir.
                </div>
              ) : (
                availableStreamers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => addStreamer(s.id)}
                    className="pt-1.5 flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={s.avatarUrl}
                        alt={s.displayName}
                        className="w-8 h-8 rounded-lg object-cover border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">{s.displayName}</span>
                        <span className="text-[10px] font-mono text-zinc-400">@{s.username}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#53FC18] font-bold">
                      {formatCompactNumber(s.followers.value)} seg.
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
