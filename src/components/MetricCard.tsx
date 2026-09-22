import React, { useState } from 'react';
import { Info, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricWithMeta, GrowthIndicator } from '../types';
import { formatNumber, formatHours } from '../utils/formatters';

interface MetricCardProps {
  id?: string;
  title: string;
  metric?: MetricWithMeta<number | null>;
  rawNumber?: number | null;
  isHours?: boolean;
  growth?: GrowthIndicator;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  highlight?: boolean;
  customFormatter?: (val: number | null) => string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  metric,
  rawNumber,
  isHours = false,
  growth,
  icon,
  subtitle,
  className = '',
  highlight = false,
  customFormatter,
}) => {
  const [showMeta, setShowMeta] = useState(false);

  const value = metric !== undefined ? metric.value : rawNumber;
  const isAvailable = value !== null && value !== undefined;
  const formattedValue = customFormatter
    ? customFormatter(value ?? null)
    : isAvailable
    ? isHours
      ? formatHours(value)
      : formatNumber(value)
    : 'NO DISPONIBLE';

  const typeLabels: Record<string, string> = {
    observed_counter: 'Contador público observado',
    calculated_average: 'Promedio aritmético calculado',
    observed_peak: 'Pico simultáneo observado',
    accumulated_hours: 'Horas acumuladas verificadas',
    not_available: 'Dato no disponible / Sin registrar',
  };

  return (
    <div
      id={id}
      className={`relative bg-[#111619] border ${highlight ? 'border-[#53FC18]/50 shadow-[0_0_15px_rgba(83,252,24,0.08)]' : 'border-zinc-800/90 hover:border-zinc-700/80'} rounded-xl p-4 transition-all duration-150 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {metric && (
          <button
            onClick={() => setShowMeta(!showMeta)}
            aria-label={`Ver metadatos de ${title}`}
            className="text-slate-500 hover:text-[#53FC18] p-1 rounded-md transition-colors"
            title="Detalles de verificación y fuente"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span
          className={`font-mono font-bold tracking-tight ${
            isAvailable ? 'text-2xl lg:text-3xl text-white' : 'text-sm font-sans font-medium text-zinc-500'
          }`}
        >
          {formattedValue}
        </span>

        {growth && growth.trend !== 'no_data' && (
          <div
            className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded ${
              growth.trend === 'positive'
                ? 'bg-emerald-950/70 text-[#53FC18] border border-emerald-800/40'
                : growth.trend === 'negative'
                ? 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {growth.trend === 'positive' && <TrendingUp className="w-3 h-3" />}
            {growth.trend === 'negative' && <TrendingDown className="w-3 h-3" />}
            {growth.trend === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{growth.displayText}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-[11px] text-slate-500 truncate">{subtitle}</p>
      )}

      {/* Metadata Tooltip / Popover Panel for Transparency (Rule 20) */}
      {showMeta && metric && (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-slate-300 space-y-1.5 bg-[#0e1214] -mx-2 -mb-2 p-2.5 rounded-b-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-white flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#53FC18]" />
              Ficha Técnica
            </span>
            <button
              onClick={() => setShowMeta(false)}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Fuente:</span>
            <span className="font-medium text-slate-200">{metric.source || 'KICK'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Captura:</span>
            <span className="font-mono text-slate-200">{metric.captureDate || '20/09/2026'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Periodo:</span>
            <span className="text-slate-200">{metric.period || 'Observado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tipo de dato:</span>
            <span className="text-slate-200">
              {metric.dataType && typeLabels[metric.dataType] ? typeLabels[metric.dataType] : (metric.dataType || 'Observado')}
            </span>
          </div>
          {metric.notes && (
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-zinc-800/50">
              {metric.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
