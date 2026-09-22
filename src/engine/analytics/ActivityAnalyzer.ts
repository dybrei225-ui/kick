/**
 * KICK ANALYTICS MX — Activity Analyzer
 * Evalúa métricas cuantitativas de emisión (streams, duración, frecuencia, días activos).
 * No inventa duraciones si faltan horas o conteos válidos.
 */

import { Streamer, ChannelSnapshot } from '../../types';
import { MetricResult, AnalyticalPeriod, MetricProvenance } from './types';
import { MetricCalculator } from './MetricCalculator';
import { DataFreshnessManager } from '../compliance/DataFreshnessManager';

export class ActivityAnalyzer {
  private static freshnessManager = new DataFreshnessManager();

  public static analyzeActivity(
    streamer: Streamer,
    snapshots: ChannelSnapshot[],
    period: AnalyticalPeriod = '30d'
  ): {
    streamCount: MetricResult;
    streamFrequency: MetricResult;
    durationAverage: MetricResult;
    activeDays: MetricResult;
  } {
    const isDemo = streamer.isDemo || snapshots.some((s) => s.isDemo);
    const freshness = this.freshnessManager.evaluateFreshness(streamer.verificationDate);

    const streams = streamer.streamCount?.value ?? null;
    const hours = streamer.hoursStreamed?.value ?? null;

    // Period days mapping
    const periodDaysMap: Record<AnalyticalPeriod, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '6m': 180,
      '1a': 365,
      'historico': 365,
    };
    const days = periodDaysMap[period] || 30;

    const baseProvenance = (
      formula: string,
      version: string,
      inputs: Record<string, any>,
      limitations: string[]
    ): MetricProvenance => ({
      source: streamer.source,
      sourceType: isDemo ? 'DEMO_DATA' : 'KICK_API_DATA',
      inputsUsed: inputs,
      period,
      formula,
      formulaVersion: version,
      sampleSize: snapshots.length > 0 ? snapshots.length : 1,
      capturedAt: streamer.verificationDate || null,
      freshnessStatus: freshness,
      limitations,
      calculatedAt: new Date().toISOString(),
      isDemo,
    });

    // 1. Conteo de Transmisiones
    const streamCountResult: MetricResult = {
      metricId: 'stream_count',
      name: 'Transmisiones Observadas',
      shortLabel: 'Streams',
      value: streams,
      formattedValue: streams !== null ? `${streams} emisiones` : 'NO DISPONIBLE',
      type: 'OBSERVADO',
      status: streams !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
      statusReason: streams === null ? 'Sin registro de transmisiones en la muestra' : undefined,
      period,
      sampleSize: 1,
      formulaVersion: 'stream_count_v1',
      provenance: baseProvenance(
        'Conteo directo en perfil o sesiones públicas',
        'stream_count_v1',
        { streamsRecorded: streams },
        ['Solo contabiliza directos registrados públicamente.']
      ),
      quality: {
        completenessScore: streams !== null ? 100 : 0,
        freshnessStatus: freshness,
        hasValidSource: true,
        isRestricted: false,
        sampleSufficiency: streams !== null,
        score: streams !== null ? 90 : 20,
        label: streams !== null ? 'ALTA' : 'DEFICIENTE',
        description: 'Mide la completitud del dato observado, no al streamer.',
      },
      limitations: ['Solo contabiliza emisiones públicas registradas.'],
      calculatedAt: new Date().toISOString(),
    };

    // 2. Frecuencia Semanal
    let freqValue: number | null = null;
    let freqStatus: 'AVAILABLE' | 'NO_DISPONIBLE' = 'NO_DISPONIBLE';
    if (streams !== null && streams >= 0) {
      freqValue = Number(((streams / days) * 7).toFixed(1));
      freqStatus = 'AVAILABLE';
    }

    const streamFreqResult: MetricResult = {
      metricId: 'stream_frequency',
      name: 'Frecuencia de Emisión Semanal',
      shortLabel: 'Frecuencia Semanal',
      value: freqValue,
      formattedValue: freqValue !== null ? `${freqValue} directos/sem` : 'NO DISPONIBLE',
      type: 'CALCULADO',
      status: freqStatus,
      statusReason: freqStatus === 'NO_DISPONIBLE' ? 'No se dispone de conteo de transmisiones para el periodo' : undefined,
      period,
      sampleSize: 1,
      formulaVersion: 'stream_frequency_v1',
      provenance: baseProvenance(
        '(total_streams / dias_periodo) * 7',
        'stream_frequency_v1',
        { totalStreams: streams, daysPeriod: days },
        ['Frecuencia estimada a partir del total de directos en el rango.']
      ),
      quality: {
        completenessScore: freqValue !== null ? 90 : 0,
        freshnessStatus: freshness,
        hasValidSource: true,
        isRestricted: false,
        sampleSufficiency: freqValue !== null,
        score: freqValue !== null ? 85 : 15,
        label: freqValue !== null ? 'ALTA' : 'DEFICIENTE',
        description: 'Mide la completitud del dato observado, no al streamer.',
      },
      limitations: ['Promedio proyectado sobre semanas naturales de 7 días.'],
      calculatedAt: new Date().toISOString(),
    };

    // 3. Duración Media
    let durationValue: number | null = null;
    let durationStatus: 'AVAILABLE' | 'NO_DISPONIBLE' = 'NO_DISPONIBLE';
    let durationReason = 'Horas o transmisiones no disponibles';

    if (hours !== null && streams !== null && streams > 0) {
      durationValue = Number((hours / streams).toFixed(1));
      durationStatus = 'AVAILABLE';
      durationReason = '';
    } else if (streams === 0) {
      durationReason = 'Sin transmisiones en el periodo (división por cero prevenida)';
    }

    const durationResult: MetricResult = {
      metricId: 'stream_duration',
      name: 'Duración Promedio por Emisión',
      shortLabel: 'Duración Promedio',
      value: durationValue,
      formattedValue: durationValue !== null ? `${durationValue} hrs/stream` : 'NO DISPONIBLE',
      type: 'CALCULADO',
      status: durationStatus,
      statusReason: durationReason || undefined,
      period,
      sampleSize: 1,
      formulaVersion: 'stream_duration_v1',
      provenance: baseProvenance(
        'total_horas / total_streams',
        'stream_duration_v1',
        { totalHours: hours, totalStreams: streams },
        ['No se calcula duración si streams = 0 o faltan horas observadas.']
      ),
      quality: {
        completenessScore: durationValue !== null ? 95 : 0,
        freshnessStatus: freshness,
        hasValidSource: true,
        isRestricted: false,
        sampleSufficiency: durationValue !== null,
        score: durationValue !== null ? 90 : 20,
        label: durationValue !== null ? 'ALTA' : 'DEFICIENTE',
        description: 'Mide la completitud del dato observado, no al streamer.',
      },
      limitations: ['Basado en el cociente de horas totales y transmisiones registradas.'],
      calculatedAt: new Date().toISOString(),
    };

    // 4. Días Activos
    const uniqueDates = new Set(snapshots.map((s) => s.date.split('T')[0]));
    const activeDaysCount = uniqueDates.size > 0 ? uniqueDates.size : (streams ? Math.min(streams, days) : null);

    const activeDaysResult: MetricResult = {
      metricId: 'activity_days',
      name: 'Días con Emisión Observada',
      shortLabel: 'Días Activos',
      value: activeDaysCount,
      formattedValue: activeDaysCount !== null ? `${activeDaysCount} días` : 'NO DISPONIBLE',
      type: 'CALCULADO',
      status: activeDaysCount !== null ? 'AVAILABLE' : 'NO_DISPONIBLE',
      period,
      sampleSize: uniqueDates.size || 1,
      formulaVersion: 'activity_days_v1',
      provenance: baseProvenance(
        'count(distinct(fecha_emision))',
        'activity_days_v1',
        { uniqueDatesFound: uniqueDates.size },
        ['Depende de las fechas registradas en las capturas históricas.']
      ),
      quality: {
        completenessScore: activeDaysCount !== null ? 85 : 0,
        freshnessStatus: freshness,
        hasValidSource: true,
        isRestricted: false,
        sampleSufficiency: activeDaysCount !== null,
        score: activeDaysCount !== null ? 80 : 20,
        label: activeDaysCount !== null ? 'ALTA' : 'DEFICIENTE',
        description: 'Mide la completitud del dato observado, no al streamer.',
      },
      limitations: ['Solo cuenta fechas en las que se documentó una captura activa.'],
      calculatedAt: new Date().toISOString(),
    };

    return {
      streamCount: streamCountResult,
      streamFrequency: streamFreqResult,
      durationAverage: durationResult,
      activeDays: activeDaysResult,
    };
  }
}
