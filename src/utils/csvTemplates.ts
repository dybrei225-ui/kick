/**
 * KICK ANALYTICS MX — CSV TEMPLATES & HELPERS (Fase 4, Reqs 14, 15)
 * Plantillas oficiales descargables y descripciones de campos.
 */

export const STREAMERS_CSV_TEMPLATE_HEADERS = [
  'username',
  'name',
  'followers',
  'averageViewers',
  'peakViewers',
  'hoursStreamed',
  'streamsCount',
  'category',
  'status',
  'capturedAt',
  'source',
  'dataType',
  'sourceUrl',
];

export const STREAMERS_CSV_SAMPLE_ROW = [
  'lonche',
  'Lonche',
  '125000',
  '3400',
  '22100',
  '142',
  '28',
  'Gaming',
  'active',
  '2026-09-21',
  'Auditoría Pública KICK',
  'OBSERVED',
  'https://kick.com/lonche',
];

export const SNAPSHOTS_CSV_TEMPLATE_HEADERS = [
  'username',
  'date',
  'followers',
  'averageViewers',
  'peakViewers',
  'hoursStreamed',
  'category',
  'source',
  'dataType',
  'sourceUrl',
];

export const SNAPSHOTS_CSV_SAMPLE_ROW = [
  'lonche',
  '2026-09-21',
  '125000',
  '3400',
  '22100',
  '142',
  'Gaming',
  'Auditoría Pública KICK',
  'OBSERVED',
  'https://kick.com/lonche',
];

export function downloadCsvTemplate(type: 'streamers' | 'snapshots') {
  let content = '';
  let filename = '';

  if (type === 'streamers') {
    content = `${STREAMERS_CSV_TEMPLATE_HEADERS.join(',')}\n${STREAMERS_CSV_SAMPLE_ROW.join(',')}\n`;
    filename = 'kick_analytics_mx_plantilla_streamers.csv';
  } else {
    content = `${SNAPSHOTS_CSV_TEMPLATE_HEADERS.join(',')}\n${SNAPSHOTS_CSV_SAMPLE_ROW.join(',')}\n`;
    filename = 'kick_analytics_mx_plantilla_snapshots_historicos.csv';
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CSV_FIELD_GUIDE = [
  {
    field: 'username',
    description: '@ del canal sin espacios ni caracteres extraños (ej: "lonche", "@aldogeek").',
    required: true,
    example: 'lonche',
  },
  {
    field: 'name / displayName',
    description: 'Nombre visible o público del creador (ej: "Lonche").',
    required: false,
    example: 'Lonche',
  },
  {
    field: 'followers',
    description: 'Número entero de seguidores registrados.',
    required: false,
    example: '125000',
  },
  {
    field: 'averageViewers',
    description: 'Promedio de espectadores en transmisiones recientes.',
    required: false,
    example: '3400',
  },
  {
    field: 'peakViewers',
    description: 'Pico máximo de espectadores simultáneos registrado.',
    required: false,
    example: '22100',
  },
  {
    field: 'hoursStreamed',
    description: 'Horas acumuladas de transmisión en el período.',
    required: false,
    example: '142',
  },
  {
    field: 'category',
    description: 'Categoría principal (ej: Gaming, Just Chatting, IRL, Variedad).',
    required: false,
    example: 'Gaming',
  },
  {
    field: 'status',
    description: 'active | low_activity | inactive | suspended | unverifiable.',
    required: false,
    example: 'active',
  },
  {
    field: 'capturedAt / date',
    description: 'Fecha en formato ISO 8601 (AAAA-MM-DD), ej: 2026-09-21.',
    required: false,
    example: '2026-09-21',
  },
  {
    field: 'dataType',
    description: 'Procedencia epistemológica: OBSERVED (dato observado), MANUAL (dato verificado manualmente), DEMO (dato demostrativo).',
    required: false,
    example: 'OBSERVED',
  },
  {
    field: 'source',
    description: 'Identificación de procedencia o auditoría.',
    required: false,
    example: 'CSV_IMPORT',
  },
  {
    field: 'sourceUrl',
    description: 'URL de verificación directa si existe, o dejar en blanco.',
    required: false,
    example: 'https://kick.com/lonche',
  },
];
