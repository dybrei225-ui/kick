/**
 * KICK ANALYTICS MX — Metric Explanation Component
 * Desglose transparente y auditable de proveniencia, fórmula, muestra y limitaciones de cualquier métrica.
 * Diseñado mobile-first (Android) y táctil, accesible y con alto contraste.
 */

import React, { useState } from 'react';
import {
  Info,
  X,
  ShieldCheck,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  Database,
  Calculator,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { MetricResult } from '../engine/analytics/types';

interface MetricExplanationProps {
  metric: MetricResult;
  buttonLabel?: string;
  className?: string;
  variant?: 'icon' | 'badge' | 'button';
}

export const MetricExplanation: React.FC<MetricExplanationProps> = ({
  metric,
  buttonLabel = 'Ver cálculo',
  className = '',
  variant = 'icon',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusBadge = () => {
    switch (metric.status) {
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/70 text-[#53FC18] border border-emerald-800/40">
            DISPONIBLE
          </span>
        );
      case 'INSUFFICIENT_DATA':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/40">
            DATOS INSUFICIENTES
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/40">
            DATOS EXPIRADOS (&gt;24H)
          </span>
        );
      case 'RESTRICTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/70 text-red-300 border border-red-800/40">
            ACCESO RESTRINGIDO
          </span>
        );
      case 'NO_DISPONIBLE':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            NO DISPONIBLE
          </span>
        );
    }
  };

  return (
    <>
      {variant === 'icon' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-[#53FC18] transition-colors inline-flex items-center gap-1 cursor-pointer ${className}`}
          title={`Explicación de cálculo: ${metric.name}`}
          aria-label={`Ver procedencia y fórmula de ${metric.name}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}

      {variant === 'badge' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#141a1d] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1 cursor-pointer transition-colors ${className}`}
        >
          <Calculator className="w-2.5 h-2.5 text-[#53FC18]" />
          <span>{metric.type}</span>
        </button>
      )}

      {variant === 'button' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#141a1d] hover:bg-[#1a2327] text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1.5 cursor-pointer transition-colors ${className}`}
        >
          <Info className="w-3.5 h-3.5 text-[#53FC18]" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {/* Modal / Bottom Drawer for Mobile */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#0f1416] border border-zinc-800 w-full sm:max-w-xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#12181b]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {metric.name}
                    </h3>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        metric.type === 'OBSERVADO'
                          ? 'bg-blue-950/70 text-blue-400 border border-blue-800/40'
                          : 'bg-emerald-950/70 text-[#53FC18] border border-emerald-800/40'
                      }`}
                    >
                      {metric.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Versión de fórmula: <span className="font-mono text-zinc-300">{metric.formulaVersion}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Valor y Estado */}
              <div className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Valor Resultante
                  </span>
                  <span className="text-xl font-extrabold text-white font-mono">
                    {metric.formattedValue}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Estado de Cálculo
                  </span>
                  {getStatusBadge()}
                </div>
              </div>

              {/* Razón si no está disponible */}
              {metric.statusReason && (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300 block">Condición de cálculo</span>
                    <span className="text-amber-200/80 leading-relaxed text-[11px]">
                      {metric.statusReason}
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Fuente y Origen */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Database className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Fuente y Origen de Datos</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Fuente registrada:</span>
                    <span className="text-zinc-200 font-medium">{metric.provenance.source}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Tipo de procedencia:</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-sky-400">
                      {metric.provenance.sourceType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Modo de ejecución:</span>
                    <span
                      className={`font-semibold ${
                        metric.provenance.isDemo ? 'text-purple-400' : 'text-[#53FC18]'
                      }`}
                    >
                      {metric.provenance.isDemo ? 'MODO DEMO' : 'OBSERVADO REAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Fórmula y Versión */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Calculator className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Fórmula Aplicada</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 space-y-1.5">
                  <div className="p-2 rounded bg-black/40 border border-zinc-800 text-emerald-400 font-mono text-[11px] break-all">
                    {metric.provenance.formula}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>Versión de algoritmo: {metric.formulaVersion}</span>
                    <span>Periodo: {metric.period}</span>
                  </div>
                </div>
              </div>

              {/* 3. Muestra y Datos Utilizados */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Layers className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Muestra y Variables de Entrada</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Tamaño de muestra (n):</span>
                    <span className="text-white font-bold">{metric.sampleSize} capturas/observaciones</span>
                  </div>
                  {metric.provenance.inputsUsed && (
                    <div className="mt-1 pt-1.5 border-t border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1">
                        Valores de entrada computados
                      </span>
                      <pre className="p-2 rounded bg-black/30 text-[10px] font-mono text-zinc-300 overflow-x-auto">
                        {JSON.stringify(metric.provenance.inputsUsed, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Frescura y Calidad de Datos */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#53FC18]" />
                  <span>Frescura y Calidad de Datos</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Estado de frescura:</span>
                    <span className="font-semibold text-zinc-200">
                      {metric.quality.freshnessStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Data Quality Score:</span>
                    <span className="font-bold text-[#53FC18] font-mono">
                      {metric.quality.score} / 100 ({metric.quality.label})
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic pt-1 border-t border-zinc-800/60">
                    {metric.quality.description}
                  </p>
                </div>
              </div>

              {/* 5. Limitaciones del Análisis */}
              {metric.limitations && metric.limitations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Limitaciones y Supuestos</span>
                  </div>
                  <ul className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 space-y-1 text-[11px] text-zinc-400 list-disc list-inside">
                    {metric.limitations.map((lim, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-zinc-800 bg-[#12181b] flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#53FC18]" />
                Auditoría determinista conforme
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
