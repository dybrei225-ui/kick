/**
 * KICK ANALYTICS MX — Anomaly Detector Engine
 * Detección formal y robusta de anomalías estadísticas basada en Median Absolute Deviation (MAD).
 * REGLA ABSOLUTA: Una anomalía detectada significa exclusivamente que el valor observado
 * se encuentra fuera del rango habitual de la muestra. Prohibido inferir causas, fraude o bots.
 */

import { ChannelSnapshot, Streamer } from '../../types';
import { StatisticalAnomaly } from './types';
import { MetricCalculator } from './MetricCalculator';

export class AnomalyDetectorEngine {
  public static detectAnomalies(
    streamer: Streamer,
    snapshots: ChannelSnapshot[]
  ): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];
    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);

    // Si la muestra es menor a 4 observaciones, no se computan anomalías estadísticas
    if (snapshots.length < 4) {
      return anomalies;
    }

    // 1. Detección en Seguidores
    const followerValues = snapshots
      .map((s) => s.followers)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    if (followerValues.length >= 4) {
      const latestSnap = snapshots[snapshots.length - 1];
      const targetVal = latestSnap.followers ?? streamer.followers.value;

      if (targetVal !== null && targetVal !== undefined) {
        const histWithoutLatest = followerValues.slice(0, followerValues.length - 1);
        if (histWithoutLatest.length >= 3) {
          const madResult = MetricCalculator.detectAnomalyMAD(histWithoutLatest, targetVal);
          if (madResult.isAnomaly) {
            anomalies.push({
              id: `anom-fol-${streamer.username}-${latestSnap.date}`,
              streamerId: streamer.id,
              streamerUsername: streamer.username,
              streamerDisplayName: streamer.displayName,
              metricId: 'current_followers',
              metricName: 'Seguidores Observados',
              observedDate: latestSnap.date,
              observedValue: targetVal,
              expectedValue: madResult.expectedValue,
              expectedRange: { min: madResult.expectedMin, max: madResult.expectedMax },
              deviationMagnitude: `${madResult.deviationScore}x MAD`,
              method: 'MAD',
              sampleSize: histWithoutLatest.length,
              status: 'ANOMALIA_DETECTADA',
              neutralDisclaimer:
                'El valor observado se encuentra fuera del rango habitual de la muestra analizada. No se determina la causa ni se infiere conducta indebida o manipulación.',
              detectedAt: new Date().toISOString(),
              isDemo,
            });
          }
        }
      }
    }

    // 2. Detección en Pico de Audiencia
    const peakValues = snapshots
      .map((s) => s.peakViewers)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    if (peakValues.length >= 4) {
      const latestSnap = snapshots[snapshots.length - 1];
      const targetPeak = latestSnap.peakViewers ?? streamer.peakViewers.value;

      if (targetPeak !== null && targetPeak !== undefined) {
        const histWithoutLatest = peakValues.slice(0, peakValues.length - 1);
        if (histWithoutLatest.length >= 3) {
          const madResult = MetricCalculator.detectAnomalyMAD(histWithoutLatest, targetPeak);
          if (madResult.isAnomaly) {
            anomalies.push({
              id: `anom-peak-${streamer.username}-${latestSnap.date}`,
              streamerId: streamer.id,
              streamerUsername: streamer.username,
              streamerDisplayName: streamer.displayName,
              metricId: 'peak_viewers',
              metricName: 'Pico de Espectadores Concurrentes',
              observedDate: latestSnap.date,
              observedValue: targetPeak,
              expectedValue: madResult.expectedValue,
              expectedRange: { min: madResult.expectedMin, max: madResult.expectedMax },
              deviationMagnitude: `${madResult.deviationScore}x MAD`,
              method: 'MAD',
              sampleSize: histWithoutLatest.length,
              status: 'ANOMALIA_DETECTADA',
              neutralDisclaimer:
                'El pico observado se aparta de la distribución habitual de la muestra analizada. No se determina la causa del evento.',
              detectedAt: new Date().toISOString(),
              isDemo,
            });
          }
        }
      }
    }

    return anomalies;
  }
}
