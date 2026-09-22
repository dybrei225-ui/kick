import React, { useState } from 'react';
import { ShieldCheck, Info, X, Database, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { ProviderType } from '../adapters/KickDataProvider';
import { dataService } from '../services/dataService';

interface DemoBannerProps {
  providerName?: string;
  isDemo: boolean;
  onConfigureAdmin?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  onConfigureAdmin,
}) => {
  const [showModal, setShowModal] = useState(false);
  const metadata = dataService.getProviderMetadata();
  const activeType = dataService.getActiveProviderType();

  const handleProviderSelect = (type: ProviderType) => {
    dataService.setProvider(type);
  };

  const getStatusBadge = () => {
    if (activeType === 'real') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>⚠ Conector pendiente</span>
        </span>
      );
    }
    if (activeType === 'manual') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          <span>● Datos manuales</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
        <span className="w-2 h-2 rounded-full bg-[#53FC18]"></span>
        <span>● Datos demo</span>
      </span>
    );
  };

  return (
    <>
      <div
        id="data-connector-status-bar"
        className="w-full bg-[#0d1214] border-b border-zinc-800 px-3 py-1.5 text-xs text-slate-300 flex items-center justify-between z-30 sticky top-0"
      >
        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
            DATOS:
          </span>
          {getStatusBadge()}
          <span className="text-zinc-500 text-xs hidden sm:inline">|</span>
          <span className="truncate hidden sm:inline text-zinc-400 text-xs">
            {metadata.statusDescription}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            id="btn-cambiar-origen-datos"
            className="text-[11px] text-zinc-300 hover:text-white bg-[#141b1e] border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-[#53FC18]" />
            <span className="font-medium">Cambiar Origen</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12171a] border border-zinc-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#53FC18]" />
                <h3 className="font-bold text-base text-white">Estado del Conector y Origen de Datos</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                KICK ANALYTICS MX garantiza una estricta separación de datos. El estado es <strong>100% real y no simulado</strong>. No mostramos &quot;Conectado a KICK&quot; si no existe una conexión legal y oficial directa.
              </p>

              {/* Selector de proveedores */}
              <div className="space-y-2 mt-3">
                {/* 1. Datos demo */}
                <div
                  onClick={() => handleProviderSelect('mock')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    activeType === 'mock'
                      ? 'bg-[#152319] border-[#53FC18] shadow-[0_0_12px_rgba(83,252,24,0.15)]'
                      : 'bg-[#101518] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#53FC18]"></span>
                      <span className="text-xs font-bold text-white">● Datos demo (Muestra Estructurada)</span>
                    </div>
                    {activeType === 'mock' && <CheckCircle2 className="w-4 h-4 text-[#53FC18]" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 pl-4.5">
                    Muestra completa de streamers mexicanos para explorar todas las gráficas, detector de emergentes y comparador.
                  </p>
                </div>

                {/* 2. Datos manuales */}
                <div
                  onClick={() => handleProviderSelect('manual')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    activeType === 'manual'
                      ? 'bg-[#13222d] border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                      : 'bg-[#101518] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      <span className="text-xs font-bold text-white">● Datos manuales (Base Verificada)</span>
                    </div>
                    {activeType === 'manual' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 pl-4.5">
                    Registros introducidos por el operador o importados mediante JSON en /admin. Persistidos localmente ($0 costo).
                  </p>
                </div>

                {/* 3. Conector oficial pendiente */}
                <div
                  onClick={() => handleProviderSelect('real')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    activeType === 'real'
                      ? 'bg-[#292013] border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                      : 'bg-[#101518] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-white">⚠ Conector pendiente (API Oficial KICK)</span>
                    </div>
                    {activeType === 'real' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 pl-4.5">
                    Preparado para conectar cuando KICK publique endpoints oficiales autorizados sin incurrir en scraping ilegal ni costos.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 pt-4 border-t border-zinc-800">
              {onConfigureAdmin ? (
                <button
                  onClick={() => {
                    setShowModal(false);
                    onConfigureAdmin();
                  }}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Ir al panel Admin
                </button>
              ) : <div />}
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black rounded-xl text-xs font-bold cursor-pointer"
              >
                Aplicar selección
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

