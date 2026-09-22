/**
 * KICK ANALYTICS MX — Data Engine: Anomaly Detector
 * Detecta cambios estadísticamente inusuales dentro del histórico disponible.
 * REGLA ABSOLUTA: No afirmar causas sin evidencia. Utilizar 'Cambio detectado'
 * y clasificaciones técnicas sobrias (INFO, CAMBIO, ADVERTENCIA, DATOS).
 */

import { Streamer, ChannelSnapshot, SystemAlert } from '../types';
import { SnapshotManager } from './SnapshotManager';
import { StatisticsEngine } from './StatisticsEngine';

export class AnomalyDetector {
  /**
   * Analiza un streamer y sus capturas históricas para identificar anomalías
   */
  public static detectStreamerAnomalies(
    streamer: Streamer,
    snapshots: ChannelSnapshot[]
  ): SystemAlert[] {
    const alerts: SystemAlert[] = [];
    const sorted = SnapshotManager.sortSnapshots(snapshots);

    if (sorted.length < 2) {
      // Si solo hay 1 captura o ninguna, verificar antigüedad de datos
      const recency = SnapshotManager.evaluateDataRecency(streamer.verificationDate);
      if (recency.category === 'MUY_ANTIGUO') {
        alerts.push({
          id: `alt-stale-${streamer.username}-${Date.now()}`,
          type: 'stale_data_record',
          category: 'DATOS',
          severity: 'DATOS',
          streamerId: streamer.id,
          streamerUsername: streamer.username,
          streamerDisplayName: streamer.displayName,
          date: streamer.verificationDate || 'Sin fecha',
          metric: 'Fecha de auditoría',
          previousValue: null,
          currentValue: streamer.verificationDate,
          variation: recency.label,
          source: streamer.source,
          description: `Registro sin actualización en más de 60 días (${recency.label}).`,
          detectedAt: new Date().toISOString(),
          isDemo: streamer.isDemo,
        });
      }
      return alerts;
    }

    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    // 1. AUMENTO INUSUAL DE SEGUIDORES (> 10% o > 15,000 en periodo corto)
    if (latest.followers !== null && previous.followers !== null && previous.followers > 0) {
      const growth = StatisticsEngine.calculateGrowth(latest.followers, previous.followers, 'Periodo reciente');
      if (growth.percentageChange !== null && growth.percentageChange >= 15.0) {
        alerts.push({
          id: `alt-followers-${streamer.username}-${latest.date}`,
          type: 'unusual_follower_surge',
          category: 'CRECIMIENTO',
          severity: 'CAMBIO',
          streamerId: streamer.id,
          streamerUsername: streamer.username,
          streamerDisplayName: streamer.displayName,
          date: latest.date,
          metric: 'Seguidores',
          previousValue: previous.followers,
          currentValue: latest.followers,
          variation: growth.displayText,
          source: latest.source,
          description: `Cambio detectado: Aumento significativo de seguidores (${growth.displayText}) respecto a la captura del ${previous.date}.`,
          detectedAt: new Date().toISOString(),
          isDemo: streamer.isDemo,
        });
      }
    }

    // 2. NUEVO PICO DE AUDIENCIA REGISTRADO
    if (latest.peakViewers !== null && previous.peakViewers !== null) {
      if (latest.peakViewers > previous.peakViewers && (latest.peakViewers - previous.peakViewers) >= 2000) {
        const diff = latest.peakViewers - previous.peakViewers;
        alerts.push({
          id: `alt-peak-${streamer.username}-${latest.date}`,
          type: 'peak_viewers_record',
          category: 'AUDIENCIA',
          severity: 'INFO',
          streamerId: streamer.id,
          streamerUsername: streamer.username,
          streamerDisplayName: streamer.displayName,
          date: latest.date,
          metric: 'Pico de espectadores',
          previousValue: previous.peakViewers,
          currentValue: latest.peakViewers,
          variation: `+${diff.toLocaleString('es-MX')} viewers`,
          source: latest.source,
          description: `Cambio detectado: Nuevo pico observado de ${latest.peakViewers.toLocaleString('es-MX')} espectadores concurrentes.`,
          detectedAt: new Date().toISOString(),
          isDemo: streamer.isDemo,
        });
      }
    }

    // 3. CAÍDA IMPORTANTE DE ACTIVIDAD (HORAS > 40%)
    if (latest.hoursStreamed !== null && previous.hoursStreamed !== null && previous.hoursStreamed > 5) {
      const hoursGrowth = StatisticsEngine.calculateGrowth(latest.hoursStreamed, previous.hoursStreamed, 'Periodo reciente');
      if (hoursGrowth.percentageChange !== null && hoursGrowth.percentageChange <= -40.0) {
        alerts.push({
          id: `alt-hours-drop-${streamer.username}-${latest.date}`,
          type: 'activity_drop_detected',
          category: 'ACTIVIDAD',
          severity: 'ADVERTENCIA',
          streamerId: streamer.id,
          streamerUsername: streamer.username,
          streamerDisplayName: streamer.displayName,
          date: latest.date,
          metric: 'Horas transmitidas',
          previousValue: previous.hoursStreamed,
          currentValue: latest.hoursStreamed,
          variation: hoursGrowth.displayText,
          source: latest.source,
          description: `Cambio detectado: Disminución del tiempo de emisión (${hoursGrowth.displayText}) entre capturas registradas.`,
          detectedAt: new Date().toISOString(),
          isDemo: streamer.isDemo,
        });
      }
    }

    // 4. RETORNO O CAMBIO A ESTADO INACTIVO
    if (streamer.status === 'inactive' && streamer.lastStreamDate) {
      alerts.push({
        id: `alt-inactivity-${streamer.username}-${latest.date}`,
        type: 'inactive_channel_alert',
        category: 'ACTIVIDAD',
        severity: 'ADVERTENCIA',
        streamerId: streamer.id,
        streamerUsername: streamer.username,
        streamerDisplayName: streamer.displayName,
        date: latest.date,
        metric: 'Estado de emisión',
        previousValue: 'Activo',
        currentValue: 'Inactivo',
        variation: 'Sin directos recientes',
        source: streamer.source,
        description: `Canal clasificado como inactivo tras superar el umbral de 60 días sin emisiones observables.`,
        detectedAt: new Date().toISOString(),
        isDemo: streamer.isDemo,
      });
    }

    // 5. EVALUACIÓN DE ANTIGÜEDAD DE AUDITORÍA
    const recency = SnapshotManager.evaluateDataRecency(streamer.verificationDate);
    if (recency.category === 'ANTIGUO' || recency.category === 'MUY_ANTIGUO') {
      alerts.push({
        id: `alt-stale-${streamer.username}-${latest.date}`,
        type: 'stale_audit_alert',
        category: 'DATOS',
        severity: 'DATOS',
        streamerId: streamer.id,
        streamerUsername: streamer.username,
        streamerDisplayName: streamer.displayName,
        date: streamer.verificationDate || 'Sin fecha',
        metric: 'Antigüedad del registro',
        previousValue: 'Auditado',
        currentValue: recency.category,
        variation: recency.label,
        source: streamer.source,
        description: `Información de auditoría clasificada como ${recency.category} (${recency.label}). Se requiere nueva captura.`,
        detectedAt: new Date().toISOString(),
        isDemo: streamer.isDemo,
      });
    }

    return alerts;
  }

  /**
   * Genera las alertas agregadas para todo el ecosistema
   */
  public static scanEcosystemAnomalies(
    streamers: Streamer[],
    getSnapshotsFn: (streamerId: string) => ChannelSnapshot[]
  ): SystemAlert[] {
    const allAlerts: SystemAlert[] = [];
    for (const streamer of streamers) {
      const snaps = getSnapshotsFn(streamer.id);
      const streamerAlerts = this.detectStreamerAnomalies(streamer, snaps);
      allAlerts.push(...streamerAlerts);
    }
    // Ordenar de más reciente a más antiguo
    return allAlerts.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Evalúa anomalías globales para una lista de streamers y snapshots
   */
  public static evaluatePlatformAnomalies(
    streamers: Streamer[],
    snapshots: ChannelSnapshot[]
  ): SystemAlert[] {
    return this.scanEcosystemAnomalies(streamers, (streamerId) =>
      snapshots.filter((s) => s.streamerId === streamerId)
    );
  }
}
