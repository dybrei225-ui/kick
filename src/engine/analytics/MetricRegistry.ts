/**
 * KICK ANALYTICS MX — Metric Definition Registry
 * Catálogo centralizado de todas las métricas observables y calculadas.
 * Cada métrica posee definición formal, versión de fórmula, requerimientos de muestra y limitaciones.
 */

import { MetricDefinition } from './types';

export class MetricRegistry {
  private static definitions: Map<string, MetricDefinition> = new Map();

  static {
    MetricRegistry.initializeRegistry();
  }

  private static initializeRegistry(): void {
    const defs: MetricDefinition[] = [
      // 1. Current Followers (OBSERVADO)
      {
        id: 'current_followers',
        name: 'Seguidores Actuales',
        shortLabel: 'Seguidores',
        description: 'Cantidad de seguidores públicos registrados en el perfil de KICK al momento del corte.',
        type: 'OBSERVADO',
        formula: 'Observación directa del valor de seguidores en perfil público',
        formulaVersion: 'observed_counter_v1',
        inputMetrics: [],
        requiredFields: ['followers'],
        minimumSampleSize: 1,
        limitations: [
          'No mide audiencia activa concurrente.',
          'Sujeto a retrasos de indexación pública de KICK.',
        ],
        version: '1.0',
        unit: 'seguidores',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 2. Current Viewers (OBSERVADO)
      {
        id: 'current_viewers',
        name: 'Espectadores en Directo Actuales',
        shortLabel: 'Viewers Ahora',
        description: 'Espectadores concurrentes conectados a la transmisión en vivo en el instante de la observación.',
        type: 'OBSERVADO',
        formula: 'Lectura puntual del endpoint de livestream activo',
        formulaVersion: 'observed_livestream_v1',
        inputMetrics: [],
        requiredFields: ['currentViewers'],
        minimumSampleSize: 1,
        limitations: [
          'Solo disponible cuando el canal se encuentra en transmisión activa.',
          'Métrica de alta volatilidad temporal.',
        ],
        version: '1.0',
        unit: 'viewers',
        sourceRequirements: ['KICK_PUBLIC', 'DEMO', 'MANUAL'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 3. Follower Growth Absolute (CALCULADO)
      {
        id: 'follower_growth_absolute',
        name: 'Crecimiento Absoluto de Seguidores',
        shortLabel: 'Cambio Seguidores',
        description: 'Diferencia neta en número de seguidores entre el final y el inicio del período analizado.',
        type: 'CALCULADO',
        formula: 'valor_final - valor_inicial',
        formulaVersion: 'follower_growth_abs_v1',
        inputMetrics: ['current_followers'],
        requiredFields: ['followers'],
        minimumSampleSize: 2,
        limitations: [
          'Requiere al menos dos observaciones cronológicamente separadas en el período.',
          'No distingue entre nuevos seguidores netos y desuscripciones.',
        ],
        version: '1.0',
        unit: 'seguidores',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 4. Follower Growth Percentage (CALCULADO)
      {
        id: 'follower_growth_percentage',
        name: 'Tasa de Crecimiento Porcentual de Seguidores',
        shortLabel: 'Crecimiento %',
        description: 'Variación porcentual de seguidores respecto al valor base inicial.',
        type: 'CALCULADO',
        formula: '((valor_final - valor_inicial) / valor_inicial) * 100',
        formulaVersion: 'growth_rate_v1',
        inputMetrics: ['current_followers'],
        requiredFields: ['followers'],
        minimumSampleSize: 2,
        limitations: [
          'No disponible cuando el valor inicial es cero (división por cero no permitida).',
          'Requiere al menos dos observaciones válidas dentro de la ventana temporal elegida.',
        ],
        version: '1.0',
        unit: '%',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 5. Viewer to Follower Ratio (CALCULADO)
      {
        id: 'viewer_follower_ratio',
        name: 'Ratio Espectadores / Seguidores',
        shortLabel: 'Ratio Viewers/Followers',
        description: 'Proporción matemática entre la concurrencia de espectadores y el total acumulado de seguidores.',
        type: 'CALCULADO',
        formula: 'viewers / followers',
        formulaVersion: 'viewer_follower_ratio_v1',
        inputMetrics: ['current_viewers', 'current_followers'],
        requiredFields: ['avgViewers', 'followers'],
        minimumSampleSize: 1,
        limitations: [
          'No disponible si followers = 0.',
          'No debe interpretarse automáticamente como tasa de engagement cualitativo.',
        ],
        version: '1.0',
        unit: 'ratio',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 6. Stream Count (OBSERVADO)
      {
        id: 'stream_count',
        name: 'Transmisiones Observadas',
        shortLabel: 'Streams',
        description: 'Total de transmisiones o sesiones en vivo registradas en el período.',
        type: 'OBSERVADO',
        formula: 'Conteo de registros de transmisiones válidas en la muestra',
        formulaVersion: 'stream_count_v1',
        inputMetrics: [],
        requiredFields: ['streamCount'],
        minimumSampleSize: 1,
        limitations: [
          'Solo computa emisiones documentadas en el registro histórico.',
          'Transmisiones eliminadas por el creador no son detectables retroactivamente.',
        ],
        version: '1.0',
        unit: 'emisiones',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 7. Stream Frequency (CALCULADO)
      {
        id: 'stream_frequency',
        name: 'Frecuencia de Emisión Semanal',
        shortLabel: 'Streams/Semana',
        description: 'Tasa promedio de directos realizados por semana en el intervalo evaluado.',
        type: 'CALCULADO',
        formula: '(total_streams / dias_periodo) * 7',
        formulaVersion: 'stream_frequency_v1',
        inputMetrics: ['stream_count'],
        requiredFields: ['streamCount'],
        minimumSampleSize: 1,
        limitations: [
          'Requiere ventana de tiempo mínima de 7 días con registro de fechas.',
        ],
        version: '1.0',
        unit: 'streams/sem',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 8. Stream Duration (CALCULADO)
      {
        id: 'stream_duration',
        name: 'Duración Promedio por Emisión',
        shortLabel: 'Duración Promedio',
        description: 'Tiempo medio de duración por transmisión observada.',
        type: 'CALCULADO',
        formula: 'total_horas / total_streams',
        formulaVersion: 'stream_duration_v1',
        inputMetrics: ['hours_streamed', 'stream_count'],
        requiredFields: ['hoursStreamed', 'streamCount'],
        minimumSampleSize: 1,
        limitations: [
          'No disponible si streamCount = 0.',
          'No se calcula si no existen marcas de tiempo o registro de horas válido.',
        ],
        version: '1.0',
        unit: 'horas/stream',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 9. Average Viewers (CALCULADO)
      {
        id: 'average_viewers',
        name: 'Audiencia Media Concurrente',
        shortLabel: 'Media Viewers',
        description: 'Media aritmética simple de espectadores concurrentes observados.',
        type: 'CALCULADO',
        formula: 'sum(viewers) / n',
        formulaVersion: 'average_viewers_v1',
        inputMetrics: [],
        requiredFields: ['avgViewers'],
        minimumSampleSize: 1,
        limitations: [
          'Sensible a picos atípicos en transmisiones con eventos especiales.',
          'Representa exclusivamente las muestras registradas, no cada minuto del directo.',
        ],
        version: '1.0',
        unit: 'viewers',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 10. Median Viewers (CALCULADO)
      {
        id: 'median_viewers',
        name: 'Mediana de Audiencia Concurrente',
        shortLabel: 'Mediana Viewers',
        description: 'Valor intermedio de espectadores concurrentes ordenados, robusto ante valores atípicos.',
        type: 'CALCULADO',
        formula: 'percentil_50(muestras_viewers)',
        formulaVersion: 'median_viewers_v1',
        inputMetrics: [],
        requiredFields: ['avgViewers'],
        minimumSampleSize: 3,
        limitations: [
          'Requiere al menos 3 observaciones independientes para un cálculo estadísticamente significativo.',
        ],
        version: '1.0',
        unit: 'viewers',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 11. Peak Viewers (OBSERVADO)
      {
        id: 'peak_viewers',
        name: 'Pico Máximo de Espectadores',
        shortLabel: 'Pico Viewers',
        description: 'Mayor número de espectadores concurrentes detectado en una sola transmisión del período.',
        type: 'OBSERVADO',
        formula: 'max(espectadores_concurrentes_observados)',
        formulaVersion: 'observed_peak_v1',
        inputMetrics: [],
        requiredFields: ['peakViewers'],
        minimumSampleSize: 1,
        limitations: [
          'Registra el punto máximo registrado; no representa el promedio habitual.',
        ],
        version: '1.0',
        unit: 'viewers',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 12. Activity Days (CALCULADO)
      {
        id: 'activity_days',
        name: 'Días con Emisión Observada',
        shortLabel: 'Días Activos',
        description: 'Número de días de calendario distintos en los que se observó al menos una emisión.',
        type: 'CALCULADO',
        formula: 'count(distinct(date(stream_start)))',
        formulaVersion: 'activity_days_v1',
        inputMetrics: [],
        requiredFields: ['verificationDate'],
        minimumSampleSize: 1,
        limitations: [
          'Depende de la granularidad de fechas en las capturas históricas disponibles.',
        ],
        version: '1.0',
        unit: 'días',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 13. Activity Consistency (CALCULADO)
      {
        id: 'activity_consistency',
        name: 'Indicador de Regularidad Observada',
        shortLabel: 'Regularidad Observada',
        description: 'Medida estadística objetiva de variabilidad y constancia en la cadencia de transmisiones históricas.',
        type: 'CALCULADO',
        formula: '100 * (1 - min(1, desviacion_estandar(intervalos) / media(intervalos)))',
        formulaVersion: 'activity_consistency_v1',
        inputMetrics: ['stream_count'],
        requiredFields: ['streamCount'],
        minimumSampleSize: 4,
        limitations: [
          'Requiere al menos 4 registros de transmisión temporales.',
          'Mide exclusivamente regularidad matemática en el calendario; NO constituye valoración de calidad del creador.',
        ],
        version: '1.0',
        unit: '% regularidad',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 14. Trend Slope (CALCULADO)
      {
        id: 'trend_slope',
        name: 'Pendiente de Tendencia (Regresión)',
        shortLabel: 'Pendiente Tendencia',
        description: 'Inclinación de la recta de regresión lineal sobre las observaciones temporales disponibles.',
        type: 'CALCULADO',
        formula: 'cov(x, y) / var(x)',
        formulaVersion: 'trend_slope_v1',
        inputMetrics: [],
        requiredFields: ['followers'],
        minimumSampleSize: 3,
        limitations: [
          'Requiere al menos 3 puntos cronológicos.',
          'No constituye predicción ni proyección a futuro; describe la trayectoria observada en el pasado.',
        ],
        version: '1.0',
        unit: 'unidades/día',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 15. Anomaly Score (CALCULADO)
      {
        id: 'anomaly_score',
        name: 'Puntaje de Desviación Atípica (MAD/IQR)',
        shortLabel: 'Detección Anomalía',
        description: 'Distancia estadística robusta de una observación respecto al rango intercuartil o desviación mediana.',
        type: 'CALCULADO',
        formula: 'abs(x - mediana) / MAD',
        formulaVersion: 'anomaly_mad_v1',
        inputMetrics: [],
        requiredFields: [],
        minimumSampleSize: 5,
        limitations: [
          'Requiere al menos 5 observaciones históricas.',
          'Una anomalía detectada significa exclusivamente comportamiento estadístico inusual dentro de la muestra. No infiere fraude, manipulación o conducta indebida.',
        ],
        version: '1.0',
        unit: 'desviaciones',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO'],
        publicationPolicy: 'PUBLICABLE',
      },

      // 16. Data Quality Score (CALCULADO)
      {
        id: 'data_quality',
        name: 'Índice de Calidad de Datos Disponibles',
        shortLabel: 'Calidad de Datos',
        description: 'Puntuación matemática de completitud, vigencia, consistencia temporal y verificación de fuentes.',
        type: 'CALCULADO',
        formula: '(completitud * 0.35) + (frescura * 0.35) + (verificacion * 0.15) + (cobertura_temporal * 0.15)',
        formulaVersion: 'data_quality_v1',
        inputMetrics: [],
        requiredFields: [],
        minimumSampleSize: 1,
        limitations: [
          'Este indicador mide única y exclusivamente la integridad y completitud de los datos registrados.',
          'NO califica ni valora en ningún caso al streamer.',
        ],
        version: '1.0',
        unit: 'pts (0-100)',
        sourceRequirements: ['KICK_PUBLIC', 'MANUAL', 'DEMO', 'CSV_IMPORT'],
        publicationPolicy: 'PUBLICABLE',
      },
    ];

    for (const d of defs) {
      MetricRegistry.definitions.set(d.id, d);
    }
  }

  public static getDefinition(metricId: string): MetricDefinition | undefined {
    return MetricRegistry.definitions.get(metricId);
  }

  public static getAllDefinitions(): MetricDefinition[] {
    return Array.from(MetricRegistry.definitions.values());
  }

  public static getCalculatedDefinitions(): MetricDefinition[] {
    return Array.from(MetricRegistry.definitions.values()).filter((d) => d.type === 'CALCULADO');
  }

  public static getObservedDefinitions(): MetricDefinition[] {
    return Array.from(MetricRegistry.definitions.values()).filter((d) => d.type === 'OBSERVADO');
  }
}
