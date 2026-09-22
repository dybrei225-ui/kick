import React, { useState } from 'react';
import { MapPin, ShieldAlert, Users, Radio, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { RegionMetric, Streamer } from '../types';
import { formatCompactNumber, formatNumber } from '../utils/formatters';
import { PageRoute } from '../components/Navigation';

interface MexicoMapPageProps {
  regions: RegionMetric[];
  streamers: Streamer[];
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

export const MexicoMapPage: React.FC<MexicoMapPageProps> = ({
  regions,
  streamers,
  onNavigate,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('Jalisco');

  const regionDetail = regions.find((r) => r.state === selectedRegion) || regions[0];

  const streamersInRegion = streamers.filter((s) => {
    if (selectedRegion === 'Ubicación específica no disponible') {
      return !s.state;
    }
    return s.state === selectedRegion;
  });

  // State coordinates on stylized Mexico SVG map
  const stateCoordinates: Record<string, { x: number; y: number; abbr: string }> = {
    'CDMX': { x: 285, y: 280, abbr: 'CDMX' },
    'Jalisco': { x: 210, y: 260, abbr: 'JAL' },
    'Nuevo León': { x: 270, y: 170, abbr: 'NL' },
    'Puebla': { x: 305, y: 285, abbr: 'PUE' },
    'Querétaro': { x: 275, y: 250, abbr: 'QRO' },
    'Chiapas': { x: 390, y: 340, abbr: 'CHIS' },
    'San Luis Potosí': { x: 265, y: 220, abbr: 'SLP' },
  };

  return (
    <div id="mexico-map-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-6 h-6 text-[#53FC18]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Mapa de KICK México
          </h1>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Explorador de canales clasificados únicamente por <strong>ubicación confirmada públicamente</strong> por el propio streamer.
        </p>

        {/* Privacy & Methodology strict notice */}
        <div className="mt-4 p-3.5 bg-[#111714] border border-[#53FC18]/30 rounded-xl flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-5 h-5 text-[#53FC18] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Política Estricta de Privacidad Geográfica:</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              NO inferimos ubicación geográfica por IP, lenguaje o sospechas. NO utilizamos información privada. Si un canal no ha divulgado abiertamente su entidad o ciudad en su perfil o redes oficiales, se clasifica rigurosamente bajo <em>&quot;Ubicación específica no disponible&quot;</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Map Visual + Region Inspector */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Stylized Visual Map & State Selector */}
        <div className="lg:col-span-7 bg-[#111619] border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#53FC18]" />
                Entidades con Canales Confirmados
              </h3>
              <span className="text-[10px] font-mono text-[#53FC18] bg-[#53FC18]/10 px-2 py-0.5 rounded border border-[#53FC18]/20">
                7 Estados + No disponible
              </span>
            </div>

            {/* Stylized Mexico Region SVG Canvas */}
            <div className="relative bg-[#0d1214] border border-zinc-800/80 rounded-xl p-4 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 500 380" className="w-full h-auto max-h-[340px] select-none">
                {/* Stylized geometric background shape of Mexico */}
                <path
                  d="M 60,70 L 140,110 L 180,90 L 260,130 L 310,180 L 320,240 L 420,240 L 460,280 L 440,320 L 380,340 L 340,310 L 290,290 L 210,270 L 150,220 L 90,140 Z"
                  fill="#151d21"
                  stroke="#26353d"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Baja California outline stub */}
                <path
                  d="M 40,40 L 90,110 L 70,160 L 50,140 Z"
                  fill="#12181c"
                  stroke="#26353d"
                  strokeWidth="1.5"
                />

                {/* Yucatan Peninsula stub */}
                <path
                  d="M 410,240 L 460,250 L 450,290 L 400,280 Z"
                  fill="#151d21"
                  stroke="#26353d"
                  strokeWidth="1.5"
                />

                {/* Interactive State Pin Markers */}
                {Object.entries(stateCoordinates).map(([stName, coords]) => {
                  const isSelected = selectedRegion === stName;
                  const region = regions.find((r) => r.state === stName);

                  return (
                    <g
                      key={stName}
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => setSelectedRegion(stName)}
                    >
                      {/* Pulse circle for selected */}
                      {isSelected && (
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r="14"
                          fill="#53FC18"
                          fillOpacity="0.25"
                          className="animate-ping"
                        />
                      )}

                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r={isSelected ? '9' : '6'}
                        fill={isSelected ? '#53FC18' : '#334752'}
                        stroke="#0b0e0f"
                        strokeWidth="2"
                      />

                      <text
                        x={coords.x}
                        y={coords.y - 12}
                        fill={isSelected ? '#ffffff' : '#94a3b8'}
                        fontSize="10"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono"
                      >
                        {coords.abbr} ({region?.confirmedChannels || 1})
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-2 left-2 text-[10px] text-zinc-500 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                Haz clic sobre cualquier entidad para consultar sus canales
              </div>
            </div>
          </div>

          {/* Region Buttons List */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-500 block mb-2">Seleccionar entidad federativa:</span>
            <div className="flex flex-wrap gap-1.5">
              {regions.map((r) => {
                const isSelected = selectedRegion === r.state;
                return (
                  <button
                    key={r.state}
                    onClick={() => setSelectedRegion(r.state)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#1a251e] text-[#53FC18] border border-[#53FC18]/40 shadow-sm'
                        : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {r.state === 'Ubicación específica no disponible' ? 'No disponible' : r.state}
                    <span className="ml-1 text-[10px] opacity-70">({r.confirmedChannels})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Region Details & Channels */}
        <div className="lg:col-span-5 bg-[#111619] border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Entidad seleccionada
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-[#53FC18]" />
                  {selectedRegion}
                </h2>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                regionDetail.hasConfirmedLocation
                  ? 'bg-emerald-950/80 text-[#53FC18] border border-emerald-800/40'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {regionDetail.hasConfirmedLocation ? 'Confirmada' : 'Sin confirmar'}
              </span>
            </div>

            {/* Region Aggregate Stats */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-[#0e1315] p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 block">Canales públicos</span>
                <span className="text-lg font-mono font-bold text-white">
                  {regionDetail.confirmedChannels}
                </span>
              </div>
              <div className="bg-[#0e1315] p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 block">Seguidores sumados</span>
                <span className="text-lg font-mono font-bold text-[#53FC18]">
                  {formatCompactNumber(regionDetail.totalFollowers)}
                </span>
              </div>
            </div>

            {/* Channels in this region */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Canales asociados a {selectedRegion}:
              </h3>

              {streamersInRegion.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">No hay canales registrados para esta entidad.</p>
              ) : (
                <div className="space-y-2">
                  {streamersInRegion.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onNavigate('streamer_detail', { username: s.username })}
                      className="p-3 bg-[#141a1d] hover:bg-[#1a2226] border border-zinc-800/90 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={s.avatarUrl}
                          alt={s.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-white group-hover:text-[#53FC18] block truncate">
                            {s.displayName}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 block">@{s.username}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-white block">
                          {formatCompactNumber(s.followers.value)}
                        </span>
                        <span className="text-[10px] text-zinc-500">seguidores</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-[11px] text-zinc-500">
            Fuente de verificación: declaraciones públicas oficiales en biografía y transmisiones.
          </div>
        </div>
      </div>
    </div>
  );
};
