import React, { useState } from 'react';
import { formatNumber, formatCompactNumber } from '../utils/formatters';

interface ChartPoint {
  label: string;
  value: number | null;
  secondaryValue?: number | null;
  date?: string;
}

interface AreaLineChartProps {
  id?: string;
  title: string;
  periodText: string;
  data: ChartPoint[];
  color?: string; // hex
  unit?: string;
  height?: number;
  emptyMessage?: string;
}

export const AreaLineChart: React.FC<AreaLineChartProps> = ({
  id,
  title,
  periodText,
  data,
  color = '#53FC18',
  unit = '',
  height = 200,
  emptyMessage = 'No hay datos suficientes para este periodo.',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const validPoints = data.filter((d) => d.value !== null && d.value !== undefined);
  if (validPoints.length < 2) {
    return (
      <div id={id} className="bg-[#111619] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
          <span className="text-[10px] font-mono text-slate-500 bg-zinc-800/80 px-2 py-0.5 rounded">{periodText}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 text-center px-4 py-8">
          {emptyMessage}
        </div>
      </div>
    );
  }

  const values = validPoints.map((d) => d.value as number);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const paddingX = 40;
  const paddingY = 25;
  const width = 500;
  const chartH = height;

  const points = validPoints.map((d, i) => {
    const x = paddingX + (i / (validPoints.length - 1)) * (width - paddingX * 2);
    const y = chartH - paddingY - (((d.value as number) - minVal) / range) * (chartH - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${chartH - paddingY} L ${points[0].x},${chartH - paddingY} Z`;

  return (
    <div id={id} className="bg-[#111619] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h4>
          <p className="text-[11px] text-slate-500">Periodo: {periodText}</p>
        </div>
        {hoveredIdx !== null && points[hoveredIdx] ? (
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-white">
              {formatNumber(points[hoveredIdx].data.value)} {unit}
            </span>
            <span className="block text-[10px] text-[#53FC18]">
              {points[hoveredIdx].data.label}
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-[#53FC18] bg-[#53FC18]/10 border border-[#53FC18]/30 px-2 py-0.5 rounded">
            Último: {formatNumber(values[values.length - 1])} {unit}
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${chartH}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ maxHeight: `${height}px` }}
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#1f2930"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={chartH / 2}
            x2={width - paddingX}
            y2={chartH / 2}
            stroke="#1f2930"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={chartH - paddingY}
            x2={width - paddingX}
            y2={chartH - paddingY}
            stroke="#26333b"
          />

          {/* Y Axis min/max labels */}
          <text
            x={paddingX - 6}
            y={paddingY + 4}
            fill="#64748b"
            fontSize="9"
            textAnchor="end"
            fontFamily="JetBrains Mono"
          >
            {formatCompactNumber(maxVal)}
          </text>
          <text
            x={paddingX - 6}
            y={chartH - paddingY + 3}
            fill="#64748b"
            fontSize="9"
            textAnchor="end"
            fontFamily="JetBrains Mono"
          >
            {formatCompactNumber(minVal)}
          </text>

          {/* Area fill */}
          <path d={areaD} fill={`url(#grad-${title.replace(/\s+/g, '')})`} />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {points.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(i)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? '5' : '3'}
                fill={hoveredIdx === i ? '#ffffff' : color}
                stroke="#0b0e0f"
                strokeWidth="2"
                className="transition-all duration-100"
              />
              <text
                x={pt.x}
                y={chartH - 8}
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
              >
                {pt.data.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

interface BarChartProps {
  id?: string;
  title: string;
  periodText: string;
  items: { label: string; value: number; sublabel?: string }[];
  maxVal?: number;
  barColor?: string;
}

export const HorizontalBarChart: React.FC<BarChartProps> = ({
  id,
  title,
  periodText,
  items,
  barColor = '#53FC18',
}) => {
  const values = items.map((i) => i.value);
  const max = Math.max(...values, 1);

  return (
    <div id={id} className="bg-[#111619] border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h4>
        <span className="text-[10px] font-mono text-slate-500 bg-zinc-800/80 px-2 py-0.5 rounded">
          {periodText}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const pct = Math.round((item.value / max) * 100);
          return (
            <div key={idx} className="group">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium group-hover:text-white truncate">
                  {item.label}
                </span>
                <span className="font-mono text-slate-400 group-hover:text-[#53FC18] ml-2 flex-shrink-0">
                  {formatNumber(item.value)} {item.sublabel}
                </span>
              </div>
              <div className="w-full bg-[#172024] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
