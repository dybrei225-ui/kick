/**
 * KICK ANALYTICS MX — CHANNEL IDENTITY RESOLVER (Fase 6, Req 13)
 * Resuelve y garantiza la unicidad e identidad canónica de cada canal en el ecosistema.
 * 
 * Regla:
 * Orden estricto de coincidencia:
 * 1. ID oficial KICK
 * 2. Username exacto
 * 3. Identificador canónico normalizado
 * 
 * NUNCA fusionar automáticamente canales por similitud fonética, avatar o seguidores.
 * Si existe duda: marcar CONFLICTO DE IDENTIDAD y someter a revisión manual.
 */

import { Streamer } from '../../types';

export interface IdentityResolutionResult {
  isMatch: boolean;
  matchType?: 'OFFICIAL_ID' | 'EXACT_USERNAME' | 'CANONICAL_SLUG';
  hasConflict: boolean;
  conflictReason?: string;
  matchedStreamer?: Streamer;
}

export class ChannelIdentityResolver {
  private static instance: ChannelIdentityResolver;

  public static getInstance(): ChannelIdentityResolver {
    if (!ChannelIdentityResolver.instance) {
      ChannelIdentityResolver.instance = new ChannelIdentityResolver();
    }
    return ChannelIdentityResolver.instance;
  }

  /**
   * Normaliza un slug o username a su representación canónica segura
   */
  public canonicalize(usernameOrSlug: string): string {
    return usernameOrSlug
      .toLowerCase()
      .trim()
      .replace(/^@+/, '')
      .replace(/\s+/g, '');
  }

  /**
   * Resuelve si un canal entrante coincide con algún registro del catálogo existente
   */
  public resolveIdentity(
    incoming: {
      id?: string;
      channelId?: string | number;
      username: string;
      displayName?: string;
    },
    existingCatalog: Streamer[]
  ): IdentityResolutionResult {
    const incomingSlug = this.canonicalize(incoming.username);
    const incomingId = incoming.channelId ? String(incoming.channelId) : incoming.id;

    // 1. Coincidencia por ID oficial KICK (Prioridad 1)
    if (incomingId) {
      const matchById = existingCatalog.find((s) => s.id === incomingId);
      if (matchById) {
        // Verificar si el username cambió
        const existingSlug = this.canonicalize(matchById.username);
        if (existingSlug !== incomingSlug) {
          return {
            isMatch: true,
            matchType: 'OFFICIAL_ID',
            hasConflict: false,
            matchedStreamer: matchById,
            conflictReason: `Cambio de username detectado: @${matchById.username} -> @${incoming.username}`,
          };
        }
        return {
          isMatch: true,
          matchType: 'OFFICIAL_ID',
          hasConflict: false,
          matchedStreamer: matchById,
        };
      }
    }

    // 2. Coincidencia por username exacto
    const matchByUsername = existingCatalog.find(
      (s) => this.canonicalize(s.username) === incomingSlug
    );
    if (matchByUsername) {
      // Si ambos tienen ID oficial pero son distintos: CONFLICTO DE IDENTIDAD
      if (incomingId && matchByUsername.id && incomingId !== matchByUsername.id) {
        return {
          isMatch: false,
          hasConflict: true,
          conflictReason: `CONFLICTO DE IDENTIDAD: El username @${incoming.username} coincide pero el ID oficial difiere (${incomingId} vs ${matchByUsername.id}). Requiere revisión.`,
          matchedStreamer: matchByUsername,
        };
      }

      return {
        isMatch: true,
        matchType: 'EXACT_USERNAME',
        hasConflict: false,
        matchedStreamer: matchByUsername,
      };
    }

    // 3. Comprobación contra falsas fusiones (Req 13)
    // Si algún canal tiene displayName idéntico pero username distinto, NO fusionar
    if (incoming.displayName) {
      const sameDisplayName = existingCatalog.find(
        (s) =>
          s.displayName.toLowerCase().trim() === incoming.displayName?.toLowerCase().trim() &&
          this.canonicalize(s.username) !== incomingSlug
      );
      if (sameDisplayName) {
        return {
          isMatch: false,
          hasConflict: true,
          conflictReason: `CONFLICTO DE IDENTIDAD: Mismo nombre para mostrar ("${incoming.displayName}") pero usernames distintos (@${sameDisplayName.username} vs @${incoming.username}). Registro conservado independiente.`,
        };
      }
    }

    return {
      isMatch: false,
      hasConflict: false,
    };
  }
}

export const channelIdentityResolver = ChannelIdentityResolver.getInstance();
