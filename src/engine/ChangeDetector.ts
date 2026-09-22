/**
 * KICK ANALYTICS MX — CHANGE DETECTOR (Fase 4, Reqs 8, 9, 29, 30, 42)
 * Detecta y audita cambios numéricos y cualitativos entre registros de streamers.
 * Regla: NO inferir causalidad. Reportar únicamente la variación matemática u observada.
 */

import { Streamer, StreamerDiffItem, ChangeLogEntry } from '../types';
import { formatNumber } from '../utils/formatters';

export class ChangeDetector {
  /**
   * Compara un streamer existente con uno entrante y calcula todas las discrepancias
   */
  public static compareStreamers(
    existing: Streamer,
    incoming: Streamer,
    importJobId?: string
  ): {
    diffItem: StreamerDiffItem;
    logEntries: ChangeLogEntry[];
  } {
    const changes: StreamerDiffItem['changes'] = [];
    const logEntries: ChangeLogEntry[] = [];
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    // 1. Seguidores (Followers)
    const oldFollowers = existing.followers?.value ?? 0;
    const newFollowers = incoming.followers?.value ?? oldFollowers;
    if (oldFollowers !== newFollowers) {
      const diff = newFollowers - oldFollowers;
      const pct = oldFollowers > 0 ? (diff / oldFollowers) * 100 : 0;
      const diffSign = diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff);
      const pctSign = diff > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
      const trend = diff > 0 ? 'up' : 'down';

      changes.push({
        field: 'followers',
        label: 'Seguidores',
        previous: oldFollowers,
        next: newFollowers,
        diffText: diffSign,
        pctText: pctSign,
        trend,
      });

      logEntries.push({
        id: `change-flw-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'followers',
        previousValue: oldFollowers,
        newValue: newFollowers,
        changeText: `${diffSign} (${pctSign})`,
        pctText: pctSign,
        trend,
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    // 2. Espectadores promedio (Avg Viewers)
    const oldAvg = existing.avgViewers?.value ?? 0;
    const newAvg = incoming.avgViewers?.value ?? oldAvg;
    if (oldAvg !== newAvg) {
      const diff = newAvg - oldAvg;
      const pct = oldAvg > 0 ? (diff / oldAvg) * 100 : 0;
      const diffSign = diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff);
      const pctSign = diff > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
      const trend = diff > 0 ? 'up' : 'down';

      changes.push({
        field: 'avgViewers',
        label: 'Audiencia Promedio',
        previous: oldAvg,
        next: newAvg,
        diffText: diffSign,
        pctText: pctSign,
        trend,
      });

      logEntries.push({
        id: `change-avg-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'avgViewers',
        previousValue: oldAvg,
        newValue: newAvg,
        changeText: `${diffSign} (${pctSign})`,
        pctText: pctSign,
        trend,
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    // 3. Pico de espectadores (Peak Viewers)
    const oldPeak = existing.peakViewers?.value ?? 0;
    const newPeak = incoming.peakViewers?.value ?? oldPeak;
    if (oldPeak !== newPeak) {
      const diff = newPeak - oldPeak;
      const pct = oldPeak > 0 ? (diff / oldPeak) * 100 : 0;
      const diffSign = diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff);
      const pctSign = diff > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
      const trend = diff > 0 ? 'up' : 'down';

      changes.push({
        field: 'peakViewers',
        label: 'Pico Máximo de Viewers',
        previous: oldPeak,
        next: newPeak,
        diffText: diffSign,
        pctText: pctSign,
        trend,
      });

      logEntries.push({
        id: `change-pk-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'peakViewers',
        previousValue: oldPeak,
        newValue: newPeak,
        changeText: `${diffSign} (${pctSign})`,
        pctText: pctSign,
        trend,
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    // 4. Horas transmitidas (Hours Streamed)
    const oldHours = existing.hoursStreamed?.value ?? 0;
    const newHours = incoming.hoursStreamed?.value ?? oldHours;
    if (oldHours !== newHours) {
      const diff = newHours - oldHours;
      const diffSign = diff > 0 ? `+${diff}` : `${diff}`;
      const trend = diff > 0 ? 'up' : 'down';

      changes.push({
        field: 'hoursStreamed',
        label: 'Horas Transmitidas',
        previous: oldHours,
        next: newHours,
        diffText: `${diffSign} hrs`,
        trend,
      });

      logEntries.push({
        id: `change-hrs-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'hoursStreamed',
        previousValue: oldHours,
        newValue: newHours,
        changeText: `${diffSign} hrs`,
        trend,
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    // 5. Cambio de categoría principal
    if (
      incoming.primaryCategory &&
      incoming.primaryCategory.trim().toLowerCase() !== existing.primaryCategory.trim().toLowerCase()
    ) {
      changes.push({
        field: 'primaryCategory',
        label: 'Categoría Principal',
        previous: existing.primaryCategory,
        next: incoming.primaryCategory,
        diffText: `${existing.primaryCategory} → ${incoming.primaryCategory}`,
        trend: 'same',
      });

      logEntries.push({
        id: `change-cat-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'primaryCategory',
        previousValue: existing.primaryCategory,
        newValue: incoming.primaryCategory,
        changeText: `${existing.primaryCategory} → ${incoming.primaryCategory}`,
        trend: 'same',
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    // 6. Cambio de estado operativo (Status)
    if (incoming.status && incoming.status !== existing.status) {
      changes.push({
        field: 'status',
        label: 'Estado del Canal',
        previous: existing.status,
        next: incoming.status,
        diffText: `${existing.status} → ${incoming.status}`,
        trend: 'same',
      });

      logEntries.push({
        id: `change-st-${existing.username}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp,
        date: dateStr,
        streamerUsername: existing.username,
        streamerDisplayName: existing.displayName,
        field: 'status',
        previousValue: existing.status,
        newValue: incoming.status,
        changeText: `${existing.status} → ${incoming.status}`,
        trend: 'same',
        source: incoming.source || 'Importación',
        importJobId,
      });
    }

    const isUnchanged = changes.length === 0;

    return {
      diffItem: {
        username: existing.username,
        displayName: existing.displayName,
        isNew: false,
        isUnchanged,
        changes,
      },
      logEntries,
    };
  }

  /**
   * Analiza una lista completa de canales entrantes contra los existentes
   */
  public static detectBatchChanges(
    existingStreamers: Streamer[],
    incomingStreamers: Streamer[],
    importJobId?: string
  ): {
    diffs: StreamerDiffItem[];
    logEntries: ChangeLogEntry[];
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
    significantCount: number;
  } {
    const existingMap = new Map<string, Streamer>();
    existingStreamers.forEach((s) => existingMap.set(s.username.toLowerCase(), s));

    const diffs: StreamerDiffItem[] = [];
    const logEntries: ChangeLogEntry[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let significantCount = 0;

    for (const incoming of incomingStreamers) {
      const cleanUser = incoming.username.toLowerCase().trim().replace(/^@/, '');
      const existing = existingMap.get(cleanUser);

      if (!existing) {
        newCount++;
        diffs.push({
          username: incoming.username,
          displayName: incoming.displayName,
          isNew: true,
          isUnchanged: false,
          changes: [
            {
              field: 'creation',
              label: 'Nuevo Canal',
              previous: 'No registrado',
              next: 'Registrado',
              diffText: 'Canal nuevo en la base',
              trend: 'up',
            },
          ],
        });
      } else {
        const comp = this.compareStreamers(existing, incoming, importJobId);
        diffs.push(comp.diffItem);
        logEntries.push(...comp.logEntries);

        if (comp.diffItem.isUnchanged) {
          unchangedCount++;
        } else {
          updatedCount++;
          // Detectar cambios significativos (>10% seguidores o pico)
          const hasSignificant = comp.diffItem.changes.some(
            (c) =>
              (c.field === 'followers' && Math.abs(Number(c.next) - Number(c.previous)) >= 500) ||
              (c.field === 'peakViewers' && Math.abs(Number(c.next) - Number(c.previous)) >= 200) ||
              c.field === 'primaryCategory'
          );
          if (hasSignificant) significantCount++;
        }
      }
    }

    return {
      diffs,
      logEntries,
      newCount,
      updatedCount,
      unchangedCount,
      significantCount,
    };
  }
}
