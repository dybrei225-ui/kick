/**
 * KICK ANALYTICS MX — Data Engine: Source Registry
 * Registro central de fuentes de datos.
 * Regla: No afirmar que una fuente está verificada si no lo está.
 */

import { RegisteredSource, SourceType } from '../types';

export class SourceRegistry {
  private static defaultSources: RegisteredSource[] = [
    {
      id: 'src-kick-official-api',
      sourceId: 'src-kick-official-api',
      name: 'KICK Public API',
      sourceName: 'KICK Public API',
      url: 'https://docs.kick.com',
      sourceUrl: 'https://docs.kick.com',
      type: 'KICK_PUBLIC',
      sourceType: 'KICK_PUBLIC',
      capturedAt: '2026-09-22',
      verified: true,
      notes: 'Conexión oficial con la API pública para desarrolladores de KICK (OAuth 2.1).',
    },
    {
      id: 'src-kick-public',
      name: 'KICK Perfiles Públicos Oficiales',
      url: 'https://kick.com',
      type: 'KICK_PUBLIC',
      capturedAt: '2026-09-20',
      verified: true,
      notes: 'Contadores públicos observados directamente en la interfaz pública web de KICK.',
    },
    {
      id: 'src-vods-public',
      name: 'KICK Registros de VODs y Transmisiones en Vivo',
      url: 'https://kick.com',
      type: 'KICK_PUBLIC',
      capturedAt: '2026-09-20',
      verified: true,
      notes: 'Emisiones públicas archivadas y duraciones observadas en directo.',
    },
    {
      id: 'src-manual-admin',
      name: 'KICK ANALYTICS MX Registro Manual Auditado',
      url: null,
      type: 'MANUAL',
      capturedAt: '2026-09-20',
      verified: true,
      notes: 'Datos introducidos manualmente por el analista tras verificación directa.',
    },
    {
      id: 'src-demo-suite',
      name: 'Muestra Demostrativa Estructurada',
      url: null,
      type: 'DEMO',
      capturedAt: '2026-09-20',
      verified: false,
      notes: 'Registros para validación de interfaz, diseño y pruebas funcionales.',
    },
    {
      id: 'src-import-json',
      sourceId: 'src-import-json',
      name: 'Archivo JSON Importado',
      sourceName: 'Archivo JSON Importado',
      url: null,
      sourceUrl: null,
      type: 'JSON_IMPORT',
      sourceType: 'JSON_IMPORT',
      capturedAt: '2026-09-20',
      importedAt: '2026-09-20T12:00:00Z',
      verified: false,
      notes: 'Importación externa procesada tras validación estructural de 2 pasos.',
    },
    {
      id: 'src-import-csv',
      sourceId: 'src-import-csv',
      name: 'Archivo CSV Importado',
      sourceName: 'Archivo CSV Importado',
      url: null,
      sourceUrl: null,
      type: 'CSV_IMPORT',
      sourceType: 'CSV_IMPORT',
      capturedAt: '2026-09-20',
      importedAt: '2026-09-20T12:00:00Z',
      verified: false,
      notes: 'Importación masiva tabular CSV.',
    },
    {
      id: 'src-other-public',
      sourceId: 'src-other-public',
      name: 'Otras Fuentes Públicas de Auditoría',
      sourceName: 'Otras Fuentes Públicas de Auditoría',
      url: null,
      sourceUrl: null,
      type: 'OTHER_PUBLIC',
      sourceType: 'OTHER_PUBLIC',
      capturedAt: '2026-09-20',
      importedAt: '2026-09-20T12:00:00Z',
      verified: false,
      notes: 'Métricas públicas secundarias registradas bajo revisión.',
    },
  ];

  private sources: RegisteredSource[];

  constructor(customSources?: RegisteredSource[]) {
    this.sources = customSources || [...SourceRegistry.defaultSources];
  }

  public getSources(): RegisteredSource[] {
    return [...this.sources];
  }

  public getSourceById(id: string): RegisteredSource | undefined {
    return this.sources.find((s) => s.id === id || s.sourceId === id);
  }

  public registerSource(source: Omit<RegisteredSource, 'id'> & { id?: string }): RegisteredSource {
    const id = source.id || `src-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newSource: RegisteredSource = {
      ...source,
      id,
      sourceId: id,
      sourceName: source.sourceName || source.name,
      sourceUrl: source.sourceUrl !== undefined ? source.sourceUrl : source.url,
      sourceType: source.sourceType || source.type,
      importedAt: source.importedAt || new Date().toISOString(),
    };
    this.sources.push(newSource);
    return newSource;
  }

  public getSourcesByType(type: SourceType): RegisteredSource[] {
    return this.sources.filter((s) => s.type === type || s.sourceType === type);
  }

  public getVerifiedSourcesCount(): number {
    return this.sources.filter((s) => s.verified).length;
  }

  public static formatSourceUrl(url?: string | null): string {
    if (!url || url.trim() === '') {
      return 'URL NO DISPONIBLE';
    }
    return url;
  }
}
