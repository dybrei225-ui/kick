/**
 * KICK ANALYTICS MX — KICK DISCOVERY ENGINE (Fase 6, Reqs 7, 8, 9, 22)
 * Motor de descubrimiento de canales en el ecosistema KICK utilizando ÚNICAMENTE la API oficial.
 * 
 * Regla de oro:
 * NO SCRAPING, NO ENDPOINTS PRIVADOS, NO CRAWLING MASIVO.
 * Solo endpoints oficiales: GET /public/v1/livestreams, GET /public/v1/categories, GET /public/v1/channels
 * Flujo:
 * KICK API ──> DISCOVERY ──> NORMALIZE ──> DEDUPLICATE ──> VALIDATE ──> CANDIDATES
 */

import { DiscoveryCandidate, Streamer } from '../../types';
import { KickApiClient } from '../../adapters/kick/KickApiClient';
import { ChannelIdentityResolver } from './ChannelIdentityResolver';
import { Normalizer } from '../Normalizer';

export interface DiscoveryRunResult {
  totalFound: number;
  newCandidatesCount: number;
  alreadyKnownCount: number;
  requiresRegionalReviewCount: number;
  candidates: DiscoveryCandidate[];
  sourceEndpoint: string;
  executedAt: string;
}

export class KickDiscoveryEngine {
  private static instance: KickDiscoveryEngine;
  private client: KickApiClient;
  private resolver: ChannelIdentityResolver;

  private constructor() {
    this.client = KickApiClient.getInstance();
    this.resolver = ChannelIdentityResolver.getInstance();
  }

  public static getInstance(): KickDiscoveryEngine {
    if (!KickDiscoveryEngine.instance) {
      KickDiscoveryEngine.instance = new KickDiscoveryEngine();
    }
    return KickDiscoveryEngine.instance;
  }

  /**
   * Ejecuta el descubrimiento de canales activos en la API oficial de KICK
   * Consulta transmisiones en vivo (/livestreams) y extrae los canales participantes
   */
  public async discoverFromLivestreams(
    existingCatalog: Streamer[],
    limit = 50
  ): Promise<DiscoveryRunResult> {
    const executedAt = new Date().toISOString();
    const candidates: DiscoveryCandidate[] = [];

    // Llamada oficial documentada (Req 7, 8)
    const livestreams = await this.client.getLivestreams({ limit });

    let newCount = 0;
    let knownCount = 0;
    let regionalReviewCount = 0;

    for (const ls of livestreams) {
      const channel = ls.channel;
      if (!channel || (!channel.slug && !channel.username)) continue;

      const rawUsername = channel.username || channel.slug || '';
      const canonicalSlug = this.resolver.canonicalize(rawUsername);
      if (!canonicalSlug) continue;

      // Normalizar nombres
      const displayName = channel.username || channel.slug || canonicalSlug;
      const channelId = channel.id ? String(channel.id) : undefined;

      // Deduplicar e identificar contra catálogo conocido
      const resolution = this.resolver.resolveIdentity(
        {
          id: channelId,
          channelId,
          username: canonicalSlug,
          displayName,
        },
        existingCatalog
      );

      const isKnown = resolution.isMatch;
      const matched = resolution.matchedStreamer;

      // Determinar estatus regional: Nunca asumir México sin fuente fehaciente (Req 10)
      const countryStatus = matched?.country?.toLowerCase() === 'méxico'
        ? 'VERIFIED_MX'
        : 'UNKNOWN';

      if (countryStatus === 'UNKNOWN') {
        regionalReviewCount++;
      }

      if (isKnown) {
        knownCount++;
      } else {
        newCount++;
      }

      const candidate: DiscoveryCandidate = {
        id: `cand_${canonicalSlug}_${channelId || Date.now()}`,
        username: canonicalSlug,
        channelId,
        displayName,
        source: 'GET /public/v1/livestreams (KICK Public API)',
        discoveredAt: matched?.createdAt || executedAt,
        lastSeen: executedAt,
        status: isKnown ? 'KNOWN' : 'NEW',
        verificationStatus: isKnown ? 'VERIFIED' : 'PENDING',
        countryStatus,
        category: ls.category?.name || 'General',
        bio: null,
        avatarUrl: channel.profile_pic || '/placeholder-avatar.png',
        followersCount: null, // Endpoint livestreams no entrega followers; NO INVENTAR (Req 10)
        notes: resolution.conflictReason || (isKnown ? 'Canal ya registrado en catálogo' : 'Nuevo canal descubierto en transmisión en vivo'),
      };

      candidates.push(candidate);
    }

    return {
      totalFound: livestreams.length,
      newCandidatesCount: newCount,
      alreadyKnownCount: knownCount,
      requiresRegionalReviewCount: regionalReviewCount,
      candidates,
      sourceEndpoint: 'GET /public/v1/livestreams',
      executedAt,
    };
  }

  /**
   * Genera un candidato a partir de un username introducido manualmente para validación oficial
   */
  public async discoverSingleChannel(
    username: string,
    existingCatalog: Streamer[]
  ): Promise<DiscoveryCandidate | null> {
    const executedAt = new Date().toISOString();
    const cleanUsername = Normalizer.normalizeUsername(username);

    // Consulta oficial a GET /public/v1/channels/{slug}
    const channelData = await this.client.getChannel(cleanUsername);
    if (!channelData) return null;

    const channelId = channelData.id ? String(channelData.id) : undefined;
    const displayName = channelData.name || channelData.username || channelData.slug || cleanUsername;

    const resolution = this.resolver.resolveIdentity(
      {
        id: channelId,
        channelId,
        username: cleanUsername,
        displayName,
      },
      existingCatalog
    );

    const isKnown = resolution.isMatch;
    const matched = resolution.matchedStreamer;
    const countryStatus = matched?.country?.toLowerCase() === 'méxico' ? 'VERIFIED_MX' : 'UNKNOWN';

    return {
      id: `cand_${cleanUsername}_${channelId || Date.now()}`,
      username: cleanUsername,
      channelId,
      displayName,
      source: `GET /public/v1/channels/${cleanUsername} (KICK Public API)`,
      discoveredAt: matched?.createdAt || executedAt,
      lastSeen: executedAt,
      status: isKnown ? 'KNOWN' : 'NEW',
      verificationStatus: isKnown ? 'VERIFIED' : 'PENDING',
      countryStatus,
      category: channelData.category?.name || 'General',
      bio: channelData.bio || null,
      avatarUrl: channelData.profile_pic || '/placeholder-avatar.png',
      followersCount: channelData.followers_count ?? channelData.followers ?? null,
      notes: resolution.conflictReason || (isKnown ? 'Canal existente en catálogo' : 'Canal verificado contra API oficial'),
    };
  }
}

export const kickDiscoveryEngine = KickDiscoveryEngine.getInstance();
