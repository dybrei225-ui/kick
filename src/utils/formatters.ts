import { StreamerStatus } from '../types';

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NO DISPONIBLE';
  return new Intl.NumberFormat('es-MX').format(val);
}

export function formatCompactNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NO DISPONIBLE';
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  return val.toString();
}

export function formatHours(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NO DISPONIBLE';
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(val)} h`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'NO DISPONIBLE';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatFullDate(dateString: string | null | undefined): string {
  if (!dateString) return 'NO DISPONIBLE';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getStatusInfo(status: StreamerStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Activo',
        badgeClass: 'bg-emerald-950/70 text-[#53FC18] border border-emerald-800/50',
        dotClass: 'bg-[#53FC18] shadow-[0_0_8px_#53FC18]',
      };
    case 'low_activity':
      return {
        label: 'Poco activo',
        badgeClass: 'bg-amber-950/60 text-amber-400 border border-amber-800/40',
        dotClass: 'bg-amber-400',
      };
    case 'inactive':
      return {
        label: 'Inactivo',
        badgeClass: 'bg-zinc-900/80 text-zinc-400 border border-zinc-800',
        dotClass: 'bg-zinc-500',
      };
    case 'suspended':
      return {
        label: 'Suspendido',
        badgeClass: 'bg-rose-950/60 text-rose-400 border border-rose-800/40',
        dotClass: 'bg-rose-500',
      };
    case 'deleted':
      return {
        label: 'Eliminado',
        badgeClass: 'bg-red-950/70 text-red-400 border border-red-900/50',
        dotClass: 'bg-red-600',
      };
    case 'unverifiable':
    default:
      return {
        label: 'No verificable',
        badgeClass: 'bg-slate-900 text-slate-400 border border-slate-800',
        dotClass: 'bg-slate-500',
      };
  }
}

export function getCategoryBadgeColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'irl':
      return 'text-amber-300 border-amber-500/30 bg-amber-950/20';
    case 'just chatting':
      return 'text-sky-300 border-sky-500/30 bg-sky-950/20';
    case 'gaming':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20';
    case 'fortnite':
      return 'text-purple-300 border-purple-500/30 bg-purple-950/20';
    case 'minecraft':
      return 'text-lime-300 border-lime-500/30 bg-lime-950/20';
    case 'valorant':
      return 'text-rose-300 border-rose-500/30 bg-rose-950/20';
    case 'call of duty':
      return 'text-orange-300 border-orange-500/30 bg-orange-950/20';
    case 'fútbol':
      return 'text-green-300 border-green-500/30 bg-green-950/20';
    case 'noticias':
      return 'text-cyan-300 border-cyan-500/30 bg-cyan-950/20';
    case 'entretenimiento':
      return 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-950/20';
    default:
      return 'text-zinc-300 border-zinc-700/50 bg-zinc-900/40';
  }
}
