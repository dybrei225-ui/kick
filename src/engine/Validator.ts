/**
 * KICK ANALYTICS MX — Data Engine: Validator
 * Validador formal previo a cualquier persistencia o ingesta de datos.
 * Rechaza anomalías estructurales y números imposibles.
 */

import { Streamer, ChannelSnapshot } from '../types';
import { Normalizer } from './Normalizer';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  field: string;
  message: string;
  target: string;
}

export interface StreamerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData?: Partial<Streamer>;
}

export interface SnapshotValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedSnapshot?: ChannelSnapshot;
}

export class Validator {
  /**
   * Valida un registro de streamer individual
   */
  public static validateStreamer(data: unknown): StreamerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['El registro del streamer debe ser un objeto válido.'],
        warnings: [],
      };
    }

    const item = data as Record<string, any>;

    // 1. Username
    const rawUsername = item.username;
    if (!rawUsername || typeof rawUsername !== 'string') {
      errors.push('El campo "username" es estrictamente obligatorio.');
    }

    const cleanUsername = Normalizer.normalizeUsername(rawUsername);
    if (!cleanUsername || cleanUsername.length < 2) {
      errors.push(`El username "${rawUsername || ''}" no es válido (debe tener al menos 2 caracteres alfanuméricos).`);
    }

    // 2. Display Name
    const displayName = Normalizer.normalizeDisplayName(item.displayName, cleanUsername);

    // 3. Seguidores (Métrica observada)
    const followersVal = item.followers?.value !== undefined
      ? Normalizer.normalizeNumber(item.followers.value)
      : Normalizer.normalizeNumber(item.followers);

    if (followersVal !== null && followersVal < 0) {
      errors.push(`Seguidores inválidos (${followersVal}): No se permiten cantidades negativas.`);
    }

    // 4. Audiencia promedio
    const avgViewersVal = item.avgViewers?.value !== undefined
      ? Normalizer.normalizeNumber(item.avgViewers.value)
      : Normalizer.normalizeNumber(item.avgViewers);

    if (avgViewersVal !== null && avgViewersVal < 0) {
      errors.push(`Audiencia promedio inválida (${avgViewersVal}): No puede ser negativa.`);
    }

    // 5. Pico de audiencia
    const peakViewersVal = item.peakViewers?.value !== undefined
      ? Normalizer.normalizeNumber(item.peakViewers.value)
      : Normalizer.normalizeNumber(item.peakViewers);

    if (peakViewersVal !== null && peakViewersVal < 0) {
      errors.push(`Pico de espectadores inválido (${peakViewersVal}): No puede ser negativo.`);
    }

    // Regla de coherencia: Promedio no debe superar al pico
    if (avgViewersVal !== null && peakViewersVal !== null && avgViewersVal > peakViewersVal) {
      warnings.push(`Inconsistencia: La audiencia promedio (${avgViewersVal}) es superior al pico máximo registrado (${peakViewersVal}).`);
    }

    // 6. Horas transmitidas
    const hoursVal = item.hoursStreamed?.value !== undefined
      ? Normalizer.normalizeNumber(item.hoursStreamed.value)
      : Normalizer.normalizeNumber(item.hoursStreamed);

    if (hoursVal !== null && hoursVal < 0) {
      errors.push(`Horas transmitidas inválidas (${hoursVal}): No pueden ser negativas.`);
    }

    // 7. Fechas
    const verificationDate = Normalizer.normalizeDate(item.verificationDate || item.lastStreamDate) || new Date().toISOString().split('T')[0];

    // 8. Categoría
    const primaryCategory = Normalizer.normalizeCategory(item.primaryCategory || 'Gaming');

    const normalized: Partial<Streamer> = {
      ...item,
      username: cleanUsername,
      displayName,
      country: Normalizer.normalizeCountry(item.country),
      state: Normalizer.normalizeState(item.state),
      city: item.city ? String(item.city).trim() : null,
      primaryCategory,
      categories: Array.isArray(item.categories) && item.categories.length > 0
        ? item.categories.map((c: string) => Normalizer.normalizeCategory(c))
        : [primaryCategory],
      verificationDate,
      kickUrl: `https://kick.com/${cleanUsername}`,
      source: item.source ? String(item.source).trim() : 'Registro Manual Observado',
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedData: normalized,
    };
  }

  /**
   * Valida un snapshot histórico
   */
  public static validateSnapshot(data: unknown): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['El snapshot no contiene un objeto válido.'],
        warnings: [],
      };
    }

    const item = data as Record<string, any>;

    if (!item.streamerId && !item.streamerUsername) {
      errors.push('El snapshot debe vincularse a un streamerId o username.');
    }

    const normDate = Normalizer.normalizeDate(item.date || item.capturedAt);
    if (!normDate) {
      errors.push('La fecha del snapshot es obligatoria y debe ser válida.');
    }

    const followers = Normalizer.normalizeNumber(item.followers);
    if (followers !== null && followers < 0) {
      errors.push(`Seguidores del snapshot no pueden ser negativos (${followers}).`);
    }

    const avgViewers = Normalizer.normalizeNumber(item.avgViewers);
    if (avgViewers !== null && avgViewers < 0) {
      errors.push(`Audiencia promedio no puede ser negativa (${avgViewers}).`);
    }

    const peakViewers = Normalizer.normalizeNumber(item.peakViewers);
    if (peakViewers !== null && peakViewers < 0) {
      errors.push(`Pico de audiencia no puede ser negativo (${peakViewers}).`);
    }

    const hours = Normalizer.normalizeNumber(item.hoursStreamed);
    if (hours !== null && hours < 0) {
      errors.push(`Horas no pueden ser negativas (${hours}).`);
    }

    const streamCount = Normalizer.normalizeNumber(item.streamCount);
    if (streamCount !== null && streamCount < 0) {
      errors.push(`El número de transmisiones no puede ser negativo (${streamCount}).`);
    }

    const snapshot: ChannelSnapshot = {
      id: item.id || `snap-${item.streamerId || item.streamerUsername}-${normDate}`,
      streamerId: item.streamerId || `str-${Normalizer.normalizeUsername(item.streamerUsername)}`,
      date: normDate || new Date().toISOString().split('T')[0],
      period: item.period || 'Observación registrada',
      followers,
      avgViewers,
      peakViewers,
      hoursStreamed: hours,
      streamCount,
      category: Normalizer.normalizeCategory(item.category || 'Variedad'),
      source: item.source || 'KICK Perfil Público',
      capturedAt: item.capturedAt || normDate || new Date().toISOString(),
      dataType: item.dataType || 'observed',
      isDemo: Boolean(item.isDemo),
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedSnapshot: snapshot,
    };
  }
}
