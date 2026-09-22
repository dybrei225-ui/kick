/**
 * KICK ANALYTICS MX — REGIONAL VERIFICATION ENGINE (Fase 6, Reqs 10, 11)
 * Verificación estricta de nacionalidad y contexto geográfico mexicano.
 * 
 * Regla de oro:
 * NO clasificar como mexicano por: idioma español, nombre, acento, horario de stream,
 * apariencia física, categoría de juego o inferencias automatizadas.
 * 
 * Solo clasificar como MÉXICO VERIFICADO si existe una fuente fehaciente comprobable.
 */

import { RegionalVerification, RegionalVerificationStatus, Streamer } from '../../types';

export interface RegionalVerificationInput {
  status: RegionalVerificationStatus;
  verificationSource: string;
  verifiedBy: string;
  notes?: string;
  state?: string;
}

export class RegionalVerificationEngine {
  private static instance: RegionalVerificationEngine;

  public static getInstance(): RegionalVerificationEngine {
    if (!RegionalVerificationEngine.instance) {
      RegionalVerificationEngine.instance = new RegionalVerificationEngine();
    }
    return RegionalVerificationEngine.instance;
  }

  /**
   * Valida y aplica una verificación regional sobre un streamer
   */
  public verifyStreamerRegion(
    streamer: Streamer,
    input: RegionalVerificationInput
  ): { updatedStreamer: Streamer; record: RegionalVerification } {
    const now = new Date().toISOString();

    const verificationRecord: RegionalVerification = {
      status: input.status,
      verificationSource: input.verificationSource.trim(),
      verificationDate: now,
      verifiedBy: input.verifiedBy.trim(),
      notes: input.notes?.trim(),
    };

    const isMxVerified = input.status === 'VERIFIED_MX';

    const updatedStreamer: Streamer = {
      ...streamer,
      country: isMxVerified ? 'México' : 'NO DISPONIBLE',
      state: isMxVerified ? (input.state || streamer.state || 'México') : null,
      verificationDate: now,
      updatedAt: now,
    };

    return {
      updatedStreamer,
      record: verificationRecord,
    };
  }

  /**
   * Resuelve el estado de visualización regional para la UI
   */
  public getRegionalDisplayBadge(country: string | null | undefined): {
    label: string;
    status: RegionalVerificationStatus;
    badgeClass: string;
  } {
    if (country && country.toLowerCase() === 'méxico') {
      return {
        label: '🇲🇽 MÉXICO VERIFICADO',
        status: 'VERIFIED_MX',
        badgeClass: 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80',
      };
    }

    if (!country || country === 'NO DISPONIBLE') {
      return {
        label: 'PAÍS: NO DISPONIBLE',
        status: 'UNKNOWN',
        badgeClass: 'bg-zinc-900 text-zinc-400 border border-zinc-700',
      };
    }

    return {
      label: '⏳ VERIFICACIÓN PENDIENTE',
      status: 'PENDING',
      badgeClass: 'bg-amber-950/70 text-amber-400 border border-amber-800/80',
    };
  }
}

export const regionalVerificationEngine = RegionalVerificationEngine.getInstance();
