/**
 * KICK ANALYTICS MX — Analytics Report Engine
 * Genera reportes reproducibles y estructurados respaldados por PublicationGuard.
 * Bloquea formalmente exportaciones con datos de API expirados o restringidos.
 */

import { Streamer, ChannelSnapshot, CategoryData } from '../../types';
import { PublicationGuard } from '../compliance/PublicationGuard';
import { GrowthAnalyzer } from './GrowthAnalyzer';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { CategoryAnalyzer } from './CategoryAnalyzer';
import { AnomalyDetectorEngine } from './AnomalyDetectorEngine';
import { ConsistencyAnalyzer } from './ConsistencyAnalyzer';
import { ActivityAnalyzer } from './ActivityAnalyzer';
import { formatNumber, formatHours, formatDate } from '../../utils/formatters';

export interface AnalyticalReportExportResult {
  allowed: boolean;
  blockReason?: string;
  reportId: string;
  title: string;
  generatedDate: string;
  data: Record<string, unknown>;
  csvContent?: string;
  jsonContent?: string;
}

export class AnalyticsReportEngine {
  private static guard = PublicationGuard.getInstance();

  /**
   * Genera el Reporte Analítico Integral de Streamer.
   */
  public static generateStreamerReport(
    streamer: Streamer,
    snapshots: ChannelSnapshot[]
  ): AnalyticalReportExportResult {
    // 1. Verificación obligatoria con PublicationGuard
    const isRawApi = Boolean(streamer.source?.includes('api.kick.com') && !streamer.isDemo);
    const guardCheck = this.guard.canExportDataset('json', isRawApi);

    if (!guardCheck.canExport) {
      return {
        allowed: false,
        blockReason: `EXPORTACIÓN BLOQUEADA: ${guardCheck.reason}`,
        reportId: `rep-blocked-${streamer.username}`,
        title: `EXPORTACIÓN BLOQUEADA: @${streamer.username}`,
        generatedDate: new Date().toLocaleDateString('es-MX'),
        data: {},
      };
    }

    const growth30d = GrowthAnalyzer.analyzeFollowerGrowth(streamer, snapshots, '30d');
    const quality = DataQualityAnalyzer.evaluateQuality(streamer, snapshots);
    const activity = ActivityAnalyzer.analyzeActivity(streamer, snapshots, '30d');
    const consistency = ConsistencyAnalyzer.analyzeConsistency(streamer, snapshots);
    const anomalies = AnomalyDetectorEngine.detectAnomalies(streamer, snapshots);

    const reportData = {
      streamer: `@${streamer.username}`,
      displayName: streamer.displayName,
      source: streamer.source,
      country: streamer.country || 'NO DISPONIBLE',
      category: streamer.primaryCategory,
      qualityScore: quality.score,
      qualityLabel: quality.label,
      metricsObservadas: {
        followers: streamer.followers.value,
        avgViewers: streamer.avgViewers.value,
        peakViewers: streamer.peakViewers.value,
        hoursStreamed: streamer.hoursStreamed.value,
        streamCount: streamer.streamCount?.value ?? null,
      },
      metricsCalculadas: {
        crecimiento30d: growth30d.formattedPercentage,
        regularidadObservada: consistency.regularityScore,
        regularidadEtiqueta: consistency.stabilityLabel,
        frecuenciaSemanal: activity.streamFrequency.formattedValue,
        duracionMedia: activity.durationAverage.formattedValue,
      },
      anomaliasDetectadas: anomalies.length,
      anomaliasDetalle: anomalies.map((a) => ({
        metrica: a.metricName,
        fecha: a.observedDate,
        valor: a.observedValue,
        esperado: a.expectedValue,
        metodo: a.method,
      })),
      muestrasTotales: snapshots.length,
      limitaciones: [
        'El análisis se limita a las observaciones públicas registradas en la muestra.',
        'La regularidad observada no representa una evaluación subjetiva del creador.',
      ],
    };

    const csvRows = [
      ['campo', 'valor', 'tipo', 'proveniencia'],
      ['streamer', streamer.username, 'METADATO', streamer.source],
      ['seguidores', streamer.followers.value ?? 'NO DISPONIBLE', 'OBSERVADO', 'Perfil publico'],
      ['audiencia_promedio', streamer.avgViewers.value ?? 'NO DISPONIBLE', 'CALCULADO', 'Media de directos'],
      ['crecimiento_30d', growth30d.formattedPercentage, 'CALCULADO', 'growth_rate_v1'],
      ['data_quality_score', quality.score, 'CALCULADO', 'data_quality_v1'],
      ['regularidad_observada', consistency.regularityScore ?? 'NO DISPONIBLE', 'CALCULADO', 'activity_consistency_v1'],
    ];
    const csvContent = csvRows.map((r) => r.join(',')).join('\n');

    return {
      allowed: true,
      reportId: `rep-analytics-${streamer.username}-${Date.now()}`,
      title: `REPORTE ANALÍTICO DE CANAL: @${streamer.username.toUpperCase()}`,
      generatedDate: new Date().toLocaleDateString('es-MX'),
      data: reportData,
      csvContent,
      jsonContent: JSON.stringify(reportData, null, 2),
    };
  }

  /**
   * Genera el Reporte de Calidad de Datos del Sistema.
   */
  public static generateDataQualityReport(
    streamers: Streamer[],
    snapshots: ChannelSnapshot[]
  ): AnalyticalReportExportResult {
    const scores = streamers.map((s) => {
      const sSnaps = snapshots.filter((sn) => sn.streamerId === s.id);
      return {
        username: s.username,
        quality: DataQualityAnalyzer.evaluateQuality(s, sSnaps),
        snapsCount: sSnaps.length,
        source: s.source,
      };
    });

    const avgScore =
      scores.reduce((acc, curr) => acc + curr.quality.score, 0) / (scores.length || 1);

    const reportData = {
      totalCanalesAuditados: streamers.length,
      promedioDataQualityScore: Math.round(avgScore),
      desgloseCalidad: {
        alta: scores.filter((s) => s.quality.label === 'ALTA').length,
        media: scores.filter((s) => s.quality.label === 'MEDIA').length,
        baja: scores.filter((s) => s.quality.label === 'BAJA').length,
        deficiente: scores.filter((s) => s.quality.label === 'DEFICIENTE').length,
      },
      canales: scores.map((s) => ({
        username: s.username,
        score: s.quality.score,
        calidad: s.quality.label,
        frescura: s.quality.freshnessStatus,
        capturas: s.snapsCount,
      })),
      disclaimer:
        'Este reporte evalúa la completitud y frescura de los registros en base de datos. En ningún caso valora a los streamers o sus directos.',
    };

    const csvRows = [
      ['username', 'data_quality_score', 'calidad_etiqueta', 'frescura', 'capturas_muestra'],
      ...scores.map((s) => [
        s.username,
        s.quality.score,
        s.quality.label,
        s.quality.freshnessStatus,
        s.snapsCount,
      ]),
    ];

    return {
      allowed: true,
      reportId: `rep-quality-${Date.now()}`,
      title: 'REPORTE DE CALIDAD Y COBERTURA DE DATOS',
      generatedDate: new Date().toLocaleDateString('es-MX'),
      data: reportData,
      csvContent: csvRows.map((r) => r.join(',')).join('\n'),
      jsonContent: JSON.stringify(reportData, null, 2),
    };
  }
}
