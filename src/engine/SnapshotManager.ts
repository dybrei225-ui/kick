/**
 * KICK ANALYTICS MX — Data Engine: Snapshot Manager
 * Gestiona el árbol de capturas históricas independientes por canal.
 * Evalúa cobertura histórica y frescura de los datos.
 */

import { ChannelSnapshot, HistoricalCoverageReport, HistoricalCoverageLevel, DataRecencyCategory, Streamer } from '../types';

export class SnapshotManager {
  /**
   * Ordena cronológicamente las capturas históricas de un canal
   */
  public static sortSnapshots(snapshots: ChannelSnapshot[]): ChannelSnapshot[] {
    return [...snapshots].sort((a, b) => {
      const dateA = a.date || a.capturedAt || '';
      const dateB = b.date || b.capturedAt || '';
      return dateA.localeCompare(dateB);
    });
  }

  /**
   * Obtiene la captura más reciente y la anterior inmediata para cálculos de evolución
   */
  public static getLatestAndPrevious(snapshots: ChannelSnapshot[]): {
    latest: ChannelSnapshot | null;
    previous: ChannelSnapshot | null;
  } {
    const sorted = this.sortSnapshots(snapshots);
    if (sorted.length === 0) {
      return { latest: null, previous: null };
    }
    if (sorted.length === 1) {
      return { latest: sorted[0], previous: null };
    }
    return {
      latest: sorted[sorted.length - 1],
      previous: sorted[sorted.length - 2],
    };
  }

  /**
   * Filtra capturas según ventana temporal: 7d, 30d, 90d, 6m, 1a o histórico
   */
  public static filterByPeriod(
    snapshots: ChannelSnapshot[],
    period: '7d' | '30d' | '90d' | '6m' | '1a' | 'historico' = 'historico'
  ): ChannelSnapshot[] {
    const sorted = this.sortSnapshots(snapshots);
    if (period === 'historico' || sorted.length === 0) {
      return sorted;
    }

    const now = new Date();
    const cutoff = new Date();

    switch (period) {
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoff.setDate(now.getDate() - 90);
        break;
      case '6m':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1a':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = sorted.filter((s) => (s.date || s.capturedAt || '') >= cutoffStr);

    // Si el filtro temporal deja vacío pero existen datos, asegurar retornar al menos el último
    if (filtered.length === 0 && sorted.length > 0) {
      return [sorted[sorted.length - 1]];
    }

    return filtered;
  }

  /**
   * Requirement 18: Historical Coverage
   * Determina cuánto histórico posee cada streamer.
   * Regla de negocio: La clasificación ALTA/MEDIA/BAJA es exclusivamente
   * sobre la profundidad del registro y nunca una evaluación del creador.
   */
  public static calculateHistoricalCoverage(snapshots: ChannelSnapshot[]): HistoricalCoverageReport {
    if (!snapshots || snapshots.length === 0) {
      return {
        monthsSpan: 0,
        snapshotsCount: 0,
        coverage: 'HISTÓRICO_INSUFICIENTE',
        firstSnapshotDate: null,
        lastSnapshotDate: null,
      };
    }

    const sorted = this.sortSnapshots(snapshots);
    const firstDateStr = sorted[0].date || sorted[0].capturedAt || null;
    const lastDateStr = sorted[sorted.length - 1].date || sorted[sorted.length - 1].capturedAt || null;

    if (!firstDateStr || !lastDateStr || sorted.length === 1) {
      return {
        monthsSpan: 0,
        snapshotsCount: sorted.length,
        coverage: 'BAJA',
        firstSnapshotDate: firstDateStr,
        lastSnapshotDate: lastDateStr,
      };
    }

    const firstTime = new Date(firstDateStr).getTime();
    const lastTime = new Date(lastDateStr).getTime();
    const diffDays = Math.max(0, Math.round((lastTime - firstTime) / (1000 * 60 * 60 * 24)));
    const monthsSpan = Number((diffDays / 30.4).toFixed(1));

    let coverage: HistoricalCoverageLevel = 'BAJA';
    if (monthsSpan >= 6 || sorted.length >= 6) {
      coverage = 'ALTA';
    } else if (monthsSpan >= 1 || sorted.length >= 2) {
      coverage = 'MEDIA';
    }

    return {
      monthsSpan,
      snapshotsCount: sorted.length,
      coverage,
      firstSnapshotDate: firstDateStr,
      lastSnapshotDate: lastDateStr,
    };
  }

  /**
   * Requirement 32: Detector de Antigüedad de Datos
   * 0–7 días: Actualizado
   * 8–30 días: Desactualizado
   * 31–60 días: Antiguo
   * +60 días: Muy antiguo
   * Regla de negocio: Se refiere exclusivamente a la frescura de la auditoría.
   */
  public static evaluateDataRecency(verificationDate: string | null | undefined): {
    category: DataRecencyCategory;
    daysAgo: number | null;
    label: string;
    badgeColor: string;
  } {
    if (!verificationDate) {
      return {
        category: 'MUY_ANTIGUO',
        daysAgo: null,
        label: 'Sin fecha registrada',
        badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
      };
    }

    try {
      const parsed = new Date(verificationDate);
      if (isNaN(parsed.getTime())) {
        return {
          category: 'MUY_ANTIGUO',
          daysAgo: null,
          label: 'Fecha inválida',
          badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
        };
      }

      const now = new Date();
      const diffMs = now.getTime() - parsed.getTime();
      const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (daysAgo <= 7) {
        return {
          category: 'ACTUALIZADO',
          daysAgo,
          label: daysAgo === 0 ? 'Hoy (Actualizado)' : `Hace ${daysAgo}d (Actualizado)`,
          badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
        };
      } else if (daysAgo <= 30) {
        return {
          category: 'DESACTUALIZADO',
          daysAgo,
          label: `Hace ${daysAgo}d (Desactualizado)`,
          badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
        };
      } else if (daysAgo <= 60) {
        return {
          category: 'ANTIGUO',
          daysAgo,
          label: `Hace ${daysAgo}d (Antiguo)`,
          badgeColor: 'text-orange-400 bg-orange-950/40 border-orange-800/40',
        };
      } else {
        return {
          category: 'MUY_ANTIGUO',
          daysAgo,
          label: `Hace ${daysAgo}d (Muy antiguo)`,
          badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
        };
      }
    } catch {
      return {
        category: 'MUY_ANTIGUO',
        daysAgo: null,
        label: 'Error de cálculo',
        badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
      };
    }
  }
}
