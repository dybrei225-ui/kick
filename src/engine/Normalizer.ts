/**
 * KICK ANALYTICS MX — Data Engine: Normalizer
 * Normaliza campos provenientes de diversas fuentes públicas o manuales
 * al esquema estándar unificado del sistema.
 */

export class Normalizer {
  /**
   * Normaliza un nombre de usuario de Kick:
   * Ejemplos:
   * - "@Streamer" -> "streamer"
   * - "Streamer" -> "streamer"
   * - "https://kick.com/Streamer" -> "streamer"
   * - "https://www.kick.com/Streamer/" -> "streamer"
   * - "kick.com/streamer" -> "streamer"
   */
  public static normalizeUsername(raw: string | null | undefined): string {
    if (!raw) return '';
    let cleaned = raw.trim().toLowerCase();

    // Eliminar prefijo de URL de kick
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?kick\.com\//i, '');
    cleaned = cleaned.replace(/^kick\.com\//i, '');

    // Eliminar barra final y parámetros de consulta
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split('#')[0];

    // Eliminar símbolo @ inicial
    cleaned = cleaned.replace(/^@+/, '');

    // Eliminar caracteres no permitidos en nombres de usuario de Kick (alfanumérico y guion bajo)
    cleaned = cleaned.replace(/[^a-z0-9_]/g, '');

    return cleaned;
  }

  /**
   * Normaliza el nombre público o mostrado del canal
   */
  public static normalizeDisplayName(raw: string | null | undefined, fallbackUsername: string): string {
    if (!raw) return fallbackUsername;
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    return trimmed.length > 0 ? trimmed : fallbackUsername;
  }

  /**
   * Normaliza una categoría de transmisión
   */
  public static normalizeCategory(raw: string | null | undefined): string {
    if (!raw) return 'Variedad';
    const trimmed = raw.trim();
    if (!trimmed) return 'Variedad';

    const lower = trimmed.toLowerCase();
    const map: Record<string, string> = {
      'just chatting': 'Just Chatting',
      'charla': 'Just Chatting',
      'irl': 'IRL',
      'gaming': 'Gaming',
      'videojuegos': 'Gaming',
      'fortnite': 'Fortnite',
      'valorant': 'VALORANT',
      'minecraft': 'Minecraft',
      'call of duty': 'Call of Duty',
      'cod': 'Call of Duty',
      'warzone': 'Call of Duty',
      'futbol': 'Fútbol',
      'fútbol': 'Fútbol',
      'sports': 'Fútbol',
      'deportes': 'Fútbol',
      'noticias': 'Noticias',
      'news': 'Noticias',
      'entretenimiento': 'Entretenimiento',
    };

    return map[lower] || trimmed;
  }

  /**
   * Normaliza fechas al estándar ISO YYYY-MM-DD
   */
  public static normalizeDate(raw: string | null | undefined): string | null {
    if (!raw) return null;
    try {
      const parsed = new Date(raw);
      if (isNaN(parsed.getTime())) return null;
      return parsed.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Normaliza números cuantitativos asegurando que no sean NaN ni negativos erróneos
   */
  public static normalizeNumber(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'number') {
      return isNaN(raw) ? null : raw;
    }
    if (typeof raw === 'string') {
      const sanitized = raw.trim().replace(/,/g, '');
      const parsed = Number(sanitized);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Normaliza el país
   */
  public static normalizeCountry(raw: string | null | undefined): string {
    if (!raw) return 'México';
    const trimmed = raw.trim();
    if (/^mex(ico|\.?)?$/i.test(trimmed) || /^m[eé]xico$/i.test(trimmed)) {
      return 'México';
    }
    return trimmed;
  }

  /**
   * Normaliza estados de la República Mexicana
   */
  public static normalizeState(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    const stateMap: Record<string, string> = {
      'cdmx': 'CDMX',
      'ciudad de mexico': 'CDMX',
      'ciudad de méxico': 'CDMX',
      'df': 'CDMX',
      'distrito federal': 'CDMX',
      'nl': 'Nuevo León',
      'nuevo leon': 'Nuevo León',
      'nuevo león': 'Nuevo León',
      'monterrey': 'Nuevo León',
      'jal': 'Jalisco',
      'jalisco': 'Jalisco',
      'guadalajara': 'Jalisco',
      'puebla': 'Puebla',
      'pue': 'Puebla',
      'queretaro': 'Querétaro',
      'querétaro': 'Querétaro',
      'qro': 'Querétaro',
      'chiapas': 'Chiapas',
      'slp': 'San Luis Potosí',
      'san luis potosi': 'San Luis Potosí',
      'san luis potosí': 'San Luis Potosí',
      'guanajuato': 'Guanajuato',
      'gto': 'Guanajuato',
      'veracruz': 'Veracruz',
      'ver': 'Veracruz',
      'yucatan': 'Yucatán',
      'yucatán': 'Yucatán',
      'yuc': 'Yucatán',
      'baja california': 'Baja California',
      'bc': 'Baja California',
      'tijuana': 'Baja California',
    };

    return stateMap[lower] || trimmed;
  }

  /**
   * Normaliza enlaces URLs públicas asegurando protocolo https://
   */
  public static normalizeUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }
}
