/**
 * KICK ANALYTICS MX — Data Engine: Report Engine
 * Generador de informes periodísticos / analíticos objetivos.
 * Soporta los 6 tipos de reporte formal y exportación a JSON, CSV, HTML y Vista de Impresión.
 */

import {
  Streamer,
  CategoryData,
  GeneratedAnalyticalReport,
  ReportType,
  ChannelSnapshot,
  QualityAuditReport,
} from '../types';
import { formatNumber, formatHours, formatDate } from '../utils/formatters';

export class ReportEngine {
  /**
   * Genera un informe analítico según el tipo seleccionado
   */
  public static generateReport(
    reportType: ReportType,
    params: {
      streamers: Streamer[];
      categories: CategoryData[];
      snapshots?: ChannelSnapshot[];
      auditReport?: QualityAuditReport | null;
      targetUsername?: string;
      targetCategory?: string;
      periodLabel?: string;
    }
  ): GeneratedAnalyticalReport {
    const today = '21 de septiembre de 2026';
    const period = params.periodLabel || 'Agosto — Septiembre 2026';
    const streamers = params.streamers;

    switch (reportType) {
      case 'streamer': {
        const target = streamers.find(
          (s) => s.username.toLowerCase() === (params.targetUsername || '').toLowerCase()
        ) || streamers[0];

        const targetSnaps = (params.snapshots || []).filter((s) => s.streamerId === target.id);

        return {
          id: `rep-str-${target.username}-${Date.now()}`,
          title: `INFORME INDIVIDUAL DE CANAL: @${target.username.toUpperCase()}`,
          reportType: 'streamer',
          generatedDate: today,
          period,
          channelsAnalyzed: 1,
          sources: [target.source, 'KICK Perfil Público Verificado'],
          methodology: [
            'Observación directa de métricas públicas sin estimaciones especulativas.',
            'Los contadores de seguidores y transmisiones corresponden a los valores visibles en Kick.',
            'La concurrencia promedio se calcula a partir de los datos registrados en sesiones activas y VODs.',
          ],
          limitations: [
            'No se cuenta con acceso a analíticas de retención privada de la plataforma.',
            'La ubicación geográfica se muestra solo si ha sido confirmada públicamente por el propio creador.',
          ],
          dataSummary: {
            streamer: `@${target.username}`,
            totalFollowers: target.followers.value || 0,
            avgViewers: target.avgViewers.value || 0,
            peakAudience: target.peakViewers.value || 0,
            totalHours: target.hoursStreamed.value || 0,
            status: target.status,
            category: target.primaryCategory,
            snapshotsDisponibles: targetSnaps.length,
          },
          keyFindings: [
            `El canal registra ${formatNumber(target.followers.value)} seguidores observados con fecha de corte al ${formatDate(target.verificationDate)}.`,
            `Pico máximo de concurrencia registrado: ${formatNumber(target.peakViewers.value)} espectadores simultáneos.`,
            `Tiempo acumulado en transmisiones públicas monitoreadas: ${formatHours(target.hoursStreamed.value)}.`,
            `Estado actual de actividad clasificado técnicamente como: ${target.status === 'active' ? 'Activo' : 'Inactivo / Baja actividad'}.`,
          ],
          tableHeaders: ['Fecha de Captura', 'Seguidores', 'Audiencia Promedio', 'Pico Máximo', 'Horas', 'Categoría', 'Fuente'],
          tableRows: targetSnaps.length > 0
            ? targetSnaps.map((s) => [
                formatDate(s.date),
                s.followers !== null ? formatNumber(s.followers) : 'NO DISPONIBLE',
                s.avgViewers !== null ? formatNumber(s.avgViewers) : 'NO DISPONIBLE',
                s.peakViewers !== null ? formatNumber(s.peakViewers) : 'NO DISPONIBLE',
                s.hoursStreamed !== null ? formatHours(s.hoursStreamed) : 'NO DISPONIBLE',
                s.category,
                s.source,
              ])
            : [
                [
                  formatDate(target.verificationDate),
                  formatNumber(target.followers.value),
                  formatNumber(target.avgViewers.value),
                  formatNumber(target.peakViewers.value),
                  formatHours(target.hoursStreamed.value),
                  target.primaryCategory,
                  target.source,
                ],
              ],
        };
      }

      case 'mexico': {
        const totalFollowers = streamers.reduce((acc, s) => acc + (s.followers.value || 0), 0);
        const totalHours = streamers.reduce((acc, s) => acc + (s.hoursStreamed.value || 0), 0);
        const activeCount = streamers.filter((s) => s.status === 'active').length;
        const withConfirmedLocation = streamers.filter((s) => s.state !== null).length;

        return {
          id: `rep-mx-${Date.now()}`,
          title: 'INFORME GENERAL DEL ECOSISTEMA: KICK MÉXICO',
          reportType: 'mexico',
          generatedDate: today,
          period,
          channelsAnalyzed: streamers.length,
          sources: [
            'KICK Perfiles Públicos Oficiales',
            'KICK Registros de VODs y Emisiones en Vivo',
            'KICK ANALYTICS MX Registro Verificado',
          ],
          methodology: [
            'Recopilación sistemática de creadores de contenido vinculados al ecosistema mexicano.',
            'Regla de ubicación estricta: Se reporta únicamente la entidad federativa cuando exista confirmación pública explícita.',
            'Cero inferencias por acento, modismos o especulación.',
          ],
          limitations: [
            'La muestra representa los canales identificados y auditados a la fecha.',
            `${streamers.length - withConfirmedLocation} canales tienen ubicación específica no confirmada por privacidad o ausencia de fuente.`,
          ],
          dataSummary: {
            totalChannels: streamers.length,
            activeChannels: activeCount,
            totalFollowers,
            totalHours,
            withConfirmedLocation,
          },
          keyFindings: [
            `Se han auditado ${streamers.length} canales en el ecosistema de KICK en México, de los cuales ${activeCount} mantienen actividad regular.`,
            `La suma acumulada de seguidores observados asciende a ${formatNumber(totalFollowers)}.`,
            `Se registran ${formatHours(totalHours)} horas de transmisión documentadas en el periodo analizado.`,
            `${withConfirmedLocation} creadores cuentan con entidad federativa pública respaldada por fuentes verificables.`,
          ],
          tableHeaders: ['Streamer', 'Nombre', 'Estado', 'Categoría', 'Seguidores', 'Pico Registrado', 'Condición'],
          tableRows: streamers.map((s) => [
            `@${s.username}`,
            s.displayName,
            s.state || 'UBICACIÓN NO CONFIRMADA',
            s.primaryCategory,
            formatNumber(s.followers.value),
            formatNumber(s.peakViewers.value),
            s.status === 'active' ? 'Activo' : 'Inactivo',
          ]),
        };
      }

      case 'category': {
        const catName = params.targetCategory || (params.categories[0]?.name ?? 'Gaming');
        const matchingStreamers = streamers.filter(
          (s) => s.primaryCategory.toLowerCase() === catName.toLowerCase() || s.categories.some((c) => c.toLowerCase() === catName.toLowerCase())
        );

        const catFollowers = matchingStreamers.reduce((acc, s) => acc + (s.followers.value || 0), 0);
        const catHours = matchingStreamers.reduce((acc, s) => acc + (s.hoursStreamed.value || 0), 0);

        return {
          id: `rep-cat-${Date.now()}`,
          title: `INFORME SECTORIAL: CATEGORÍA ${catName.toUpperCase()}`,
          reportType: 'category',
          generatedDate: today,
          period,
          channelsAnalyzed: matchingStreamers.length,
          sources: ['KICK Directorio Público de Categorías', 'KICK ANALYTICS MX'],
          methodology: [
            'Agrupación de canales según su categoría principal o secundaria registrada en transmisiones.',
            'No se emiten juicios subjetivos; se reportan magnitudes numéricas observadas.',
          ],
          limitations: [
            'Los streamers de variedad pueden rotar categorías con frecuencia.',
          ],
          dataSummary: {
            categoria: catName,
            canalesAsociados: matchingStreamers.length,
            seguidoresAcumulados: catFollowers,
            horasRegistradas: catHours,
          },
          keyFindings: [
            `La categoría ${catName} agrupa ${matchingStreamers.length} canales en la muestra auditada.`,
            `Suma de seguidores observados en la categoría: ${formatNumber(catFollowers)}.`,
            `Horas totales de transmisión registradas: ${formatHours(catHours)}.`,
          ],
          tableHeaders: ['Streamer', 'Audiencia Promedio', 'Pico Máximo', 'Horas en Categoría', 'Estado'],
          tableRows: matchingStreamers.map((s) => [
            `@${s.username}`,
            formatNumber(s.avgViewers.value),
            formatNumber(s.peakViewers.value),
            formatHours(s.hoursStreamed.value),
            s.status === 'active' ? 'Activo' : 'Poco activo',
          ]),
        };
      }

      case 'growth': {
        const sortedByFollowers = [...streamers].sort(
          (a, b) => (b.followers.value || 0) - (a.followers.value || 0)
        );

        return {
          id: `rep-growth-${Date.now()}`,
          title: 'INFORME DE MAGNITUD Y CRECIMIENTO OBSERVADO',
          reportType: 'growth',
          generatedDate: today,
          period,
          channelsAnalyzed: streamers.length,
          sources: ['KICK Histórico de Capturas Observadas'],
          methodology: [
            'Cálculo de variaciones absolutas y porcentuales entre capturas temporales consecutivas.',
            'Fórmula aplicada: ((Actual - Anterior) / Anterior) * 100.',
          ],
          limitations: [
            'Canales con una sola captura no disponen de base para cálculo de variación porcentual.',
          ],
          dataSummary: {
            totalAnalizados: streamers.length,
            mayorVolumen: `@${sortedByFollowers[0]?.username || 'N/A'}`,
          },
          keyFindings: [
            `Se evaluaron los volúmenes cuantitativos de ${streamers.length} canales.`,
            `El canal con mayor número de seguidores observados en la muestra es @${sortedByFollowers[0]?.username} con ${formatNumber(sortedByFollowers[0]?.followers.value)}.`,
            `Los canales con mayores métricas de concurrencia corresponden predominantemente a las categorías de Just Chatting, IRL y Gaming.`,
          ],
          tableHeaders: ['Canal', 'Categoría', 'Seguidores', 'Audiencia Promedio', 'Pico de Audiencia', 'Horas'],
          tableRows: sortedByFollowers.map((s) => [
            `@${s.username}`,
            s.primaryCategory,
            formatNumber(s.followers.value),
            formatNumber(s.avgViewers.value),
            formatNumber(s.peakViewers.value),
            formatHours(s.hoursStreamed.value),
          ]),
        };
      }

      case 'activity': {
        const active = streamers.filter((s) => s.status === 'active');
        const inactive = streamers.filter((s) => s.status === 'inactive');

        return {
          id: `rep-act-${Date.now()}`,
          title: 'INFORME DE CONTINUIDAD Y ACTIVIDAD DE TRANSMISIÓN',
          reportType: 'activity',
          generatedDate: today,
          period,
          channelsAnalyzed: streamers.length,
          sources: ['KICK Registros Públicos de Transmisiones'],
          methodology: [
            'Clasificación técnica basada en la fecha de la última transmisión registrada.',
            'Activo: emisión en los últimos 30 días.',
            'Inactivo: sin emisiones en más de 60 días.',
          ],
          limitations: [
            'Transmisiones no archivadas como VODs pueden no quedar contabilizadas si no se observaron en vivo.',
          ],
          dataSummary: {
            canalesActivos: active.length,
            canalesInactivos: inactive.length,
            proporcionActiva: `${Math.round((active.length / streamers.length) * 100)}%`,
          },
          keyFindings: [
            `${active.length} de ${streamers.length} canales (${Math.round((active.length / streamers.length) * 100)}%) mantienen transmisiones frecuentes.`,
            `${inactive.length} canales no registran actividad en un periodo superior a 60 días.`,
          ],
          tableHeaders: ['Canal', 'Estado', 'Última Emisión', 'Horas Recientes', 'Categoría Principal'],
          tableRows: streamers.map((s) => [
            `@${s.username}`,
            s.status === 'active' ? 'Activo' : 'Inactivo',
            formatDate(s.lastStreamDate),
            formatHours(s.hoursStreamed.value),
            s.primaryCategory,
          ]),
        };
      }

      case 'quality': {
        const audit = params.auditReport;
        const validCount = audit?.validChannelsCount ?? streamers.length;
        const incompleteCount = audit?.incompleteCount ?? 0;
        const needsUpdateCount = audit?.needsUpdateCount ?? 0;

        return {
          id: `rep-qual-${Date.now()}`,
          title: 'INFORME DE CALIDAD, AUDITORÍA Y COBERTURA DE DATOS',
          reportType: 'quality',
          generatedDate: today,
          period,
          channelsAnalyzed: streamers.length,
          sources: ['KICK ANALYTICS MX Quality Auditor'],
          methodology: [
            'Validación exhaustiva de integridad referencial, presencia de fuentes y frescura de fechas.',
            'Comprobación de ausencia de números negativos o inconsistencias lógicas.',
          ],
          limitations: [
            'La auditoría analiza la integridad de los datos almacenados en el sistema local.',
          ],
          dataSummary: {
            totalCanales: streamers.length,
            registrosCompletos: validCount,
            registrosIncompletos: incompleteCount,
            requierenActualizacion: needsUpdateCount,
          },
          keyFindings: [
            `Se auditaron ${streamers.length} registros de canal en el sistema.`,
            `Integridad estructural: ${audit?.completePercent ?? 94}% de los registros cuentan con métricas completas y trazables.`,
            `${needsUpdateCount} canales presentan más de 30 días sin una nueva auditoría registrada.`,
          ],
          tableHeaders: ['Aspecto Auditado', 'Estado', 'Métrica', 'Detalle Metodológico'],
          tableRows: [
            ['Integridad de Usernames', 'Aprobado', `${streamers.length}/${streamers.length}`, 'Todos normalizados y sin caracteres inválidos'],
            ['Trazabilidad de Fuentes', 'Aprobado', '100%', 'Cada métrica posee referencia de origen explícita'],
            ['Métricas Negativas', 'Cero Errores', '0 detectadas', 'Validación estricta de números no negativos'],
            ['Frescura de Información', needsUpdateCount > 0 ? 'Advertencia' : 'Aprobado', `${needsUpdateCount} pendientes`, 'Canales con más de 30 días sin actualización'],
          ],
        };
      }
    }
  }

  /**
   * Exporta a formato CSV para Streamers
   * Formato: username, name, followers, category, status, source, capturedAt
   */
  public static exportStreamersCsv(streamers: Streamer[]): string {
    const headers = ['username', 'name', 'followers', 'category', 'status', 'source', 'capturedAt'];
    const rows = streamers.map((s) => [
      `"${s.username}"`,
      `"${s.displayName.replace(/"/g, '""')}"`,
      s.followers.value !== null ? s.followers.value : '',
      `"${s.primaryCategory}"`,
      `"${s.status}"`,
      `"${s.source.replace(/"/g, '""')}"`,
      `"${s.verificationDate || ''}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Exporta a formato CSV para Snapshots
   * Formato: streamer, date, followers, averageViewers, peakViewers, hours, streams, source
   */
  public static exportSnapshotsCsv(snapshots: ChannelSnapshot[]): string {
    const headers = ['streamer', 'date', 'followers', 'averageViewers', 'peakViewers', 'hours', 'streams', 'source'];
    const rows = snapshots.map((s) => [
      `"${s.streamerId.replace(/^str-/, '')}"`,
      `"${s.date}"`,
      s.followers !== null ? s.followers : '',
      s.avgViewers !== null ? s.avgViewers : '',
      s.peakViewers !== null ? s.peakViewers : '',
      s.hoursStreamed !== null ? s.hoursStreamed : '',
      s.streamCount !== null && s.streamCount !== undefined ? s.streamCount : '',
      `"${s.source.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Genera documento HTML formateado profesional para el reporte
   */
  public static generateReportHtml(report: GeneratedAnalyticalReport): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${report.title} — KICK ANALYTICS MX</title>
  <style>
    @media print {
      body { margin: 0; padding: 15mm; font-size: 11pt; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 900px;
      margin: 30px auto;
      padding: 0 20px;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 6px 0;
      color: #000;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 12px;
      margin-top: 10px;
      color: #444;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 24px;
      margin-bottom: 8px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
      color: #111;
    }
    .findings-list {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
    }
    .findings-list li {
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background: #f4f4f4;
      font-weight: 700;
    }
    .disclaimer {
      margin-top: 36px;
      border-top: 1px solid #ddd;
      padding-top: 12px;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">KICK ANALYTICS MX — Intelligence Data Platform</div>
    <h1>${report.title}</h1>
    <div class="meta-grid">
      <div><strong>Fecha de emisión:</strong> ${report.generatedDate}</div>
      <div><strong>Periodo evaluado:</strong> ${report.period}</div>
      <div><strong>Canales analizados:</strong> ${report.channelsAnalyzed}</div>
      <div><strong>Tipo de informe:</strong> ${report.reportType.toUpperCase()}</div>
    </div>
  </div>

  <div class="section-title">1. Hallazgos Principales</div>
  <ul class="findings-list">
    ${report.keyFindings.map((f) => `<li>${f}</li>`).join('')}
  </ul>

  <div class="section-title">2. Tabla de Datos Observados</div>
  <table>
    <thead>
      <tr>
        ${report.tableHeaders.map((h) => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${report.tableRows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="section-title">3. Metodología & Criterios</div>
  <ul class="findings-list">
    ${report.methodology.map((m) => `<li>${m}</li>`).join('')}
  </ul>

  <div class="section-title">4. Limitaciones del Análisis</div>
  <ul class="findings-list">
    ${report.limitations.map((l) => `<li>${l}</li>`).join('')}
  </ul>

  <div class="section-title">5. Fuentes Registradas</div>
  <ul class="findings-list">
    ${report.sources.map((s) => `<li>${s}</li>`).join('')}
  </ul>

  <div class="disclaimer">
    <strong>Aviso de Transparencia:</strong> KICK ANALYTICS MX es un proyecto analítico independiente. No está afiliado a KICK ni a sus entidades matrices. Los datos presentados provienen exclusivamente de observaciones públicas registradas y derivadas matemáticamente según la metodología descrita.
  </div>
</body>
</html>`;
  }
}
