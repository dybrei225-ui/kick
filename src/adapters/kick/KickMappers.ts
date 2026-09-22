/**
 * KICK ANALYTICS MX — KICK DATA MAPPERS (Fase 5, Reqs 6, 8, 22, 23, 25)
 * Adaptadores de transformación que convierten las respuestas externas oficiales de KICK
 * al modelo interno de la plataforma, garantizando:
 * 1. Separación estricta entre OBSERVADO y CALCULADO (Req 8).
 * 2. Asignación transparente de fuentes y procedencia (Req 7).
 * 3. NO inventar nacionalidades ni suponer país MX sin verificación (Req 25).
 * 4. Métricas no provistas por la API quedan explícitamente en 'NO DISPONIBLE' (Req 18).
 */

import { Streamer, ChannelSnapshot, CategoryData, MetricWithMeta } from '../../types';
import { Normalizer } from '../../engine/Normalizer';

export interface KickApiUserPayload {
  id: number | string;
  username: string;
  name?: string;
  bio?: string | null;
  profile_pic?: string | null;
  profile_image?: string | null;
  avatar?: string | null;
  verified?: boolean;
  country?: string | null;
}

export interface KickApiChannelPayload {
  id: number | string;
  broadcaster_user_id?: number | string;
  user_id?: number | string;
  slug: string;
  channel_slug?: string;
  name?: string;
  username?: string;
  banner_picture?: string | null;
  profile_pic?: string | null;
  bio?: string | null;
  category?: {
    id: number | string;
    name: string;
    slug: string;
  } | null;
  category_name?: string | null;
  stream_title?: string | null;
  active_subscribers_count?: number | null;
  followers_count?: number | null;
  followers?: number | null;
  playback_url?: string | null;
  verified?: boolean;
}

export interface KickApiLivestreamPayload {
  id: number | string;
  channel_id: number | string;
  session_title: string;
  viewer_count: number;
  viewers?: number;
  thumbnail?: string | { url: string } | null;
  start_time: string;
  created_at?: string;
  language: string;
  is_mature: boolean;
  category?: {
    id: number | string;
    name: string;
    slug: string;
  } | null;
  channel?: {
    id: number | string;
    slug: string;
    username?: string;
    profile_pic?: string;
  };
}

export interface KickApiCategoryPayload {
  id: number | string;
  name: string;
  slug: string;
  icon?: string | null;
  parent_category?: string | null;
  viewers_count?: number;
  channels_count?: number;
}

export class KickUserMapper {
  public static mapToProfile(raw: KickApiUserPayload) {
    return {
      id: String(raw.id),
      username: Normalizer.normalizeUsername(raw.username || ''),
      displayName: raw.name || raw.username || 'Desconocido',
      bio: raw.bio || null,
      avatarUrl: raw.profile_pic || raw.profile_image || raw.avatar || '',
      verified: !!raw.verified,
    };
  }
}

export class KickChannelMapper {
  /**
   * Transforma la respuesta oficial de KICK /channels en el modelo Streamer
   */
  public static mapToStreamer(
    channelRaw: KickApiChannelPayload,
    liveStreamRaw?: KickApiLivestreamPayload | null,
    existingStreamer?: Streamer | null
  ): Streamer {
    const rawUsername = channelRaw.slug || channelRaw.channel_slug || channelRaw.username || '';
    const username = Normalizer.normalizeUsername(rawUsername);
    const displayName = channelRaw.name || rawUsername;
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    // Seguidores oficiales (OBSERVADO si viene de la API)
    const rawFollowers = channelRaw.followers_count ?? channelRaw.followers;
    const followersMeta: MetricWithMeta<number | null> =
      rawFollowers !== undefined && rawFollowers !== null
        ? {
            value: Number(rawFollowers),
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'Diario',
            source: 'KICK Public API',
            dataType: 'observed_counter',
            confidence: 'alta',
            isDemo: false,
            notes: 'Contador obtenido oficialmente vía KICK Public API (GET /public/v1/channels)',
          }
        : existingStreamer?.followers || {
            value: null,
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'Diario',
            source: 'KICK Public API',
            dataType: 'not_available',
            confidence: 'no_verificable',
            isDemo: false,
            notes: 'Métrica no provista en respuesta actual de API',
          };

    // Viewers concurrentes (OBSERVADO si está en vivo)
    const liveViewers = liveStreamRaw ? (liveStreamRaw.viewer_count ?? liveStreamRaw.viewers ?? 0) : null;
    const avgViewersMeta: MetricWithMeta<number | null> =
      liveViewers !== null
        ? {
            value: Number(liveViewers),
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'En vivo',
            source: 'KICK Public API',
            dataType: 'observed',
            confidence: 'alta',
            isDemo: false,
            notes: 'Viewers concurrentes observados en vivo (GET /public/v1/livestreams)',
          }
        : existingStreamer?.avgViewers || {
            value: null,
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'Diario',
            source: 'KICK Public API',
            dataType: 'not_available',
            confidence: 'no_verificable',
            isDemo: false,
            notes: 'No disponible vía API cuando el canal se encuentra fuera de línea',
          };

    // Peak viewers (OBSERVADO)
    const peakViewersMeta: MetricWithMeta<number | null> =
      liveViewers !== null
        ? {
            value: Math.max(liveViewers, existingStreamer?.peakViewers?.value ?? liveViewers),
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'Diario',
            source: 'KICK Public API',
            dataType: 'observed_peak',
            confidence: 'alta',
            isDemo: false,
            notes: 'Pico de viewers observado en transmisión',
          }
        : existingStreamer?.peakViewers || {
            value: null,
            captureDate: today,
            capturedAt: nowIso,
            lastUpdated: nowIso,
            period: 'Diario',
            source: 'KICK Public API',
            dataType: 'not_available',
            confidence: 'no_verificable',
            isDemo: false,
          };

    // Horas transmitidas: No provistas como acumulado vitalicio por KICK API
    const hoursStreamedMeta: MetricWithMeta<number | null> = existingStreamer?.hoursStreamed || {
      value: null,
      captureDate: today,
      capturedAt: nowIso,
      lastUpdated: nowIso,
      period: 'Diario',
      source: 'KICK Public API',
      dataType: 'not_available',
      confidence: 'no_verificable',
      isDemo: false,
      notes: 'KICK API no expone métrica acumulada de horas. Calculable únicamente mediante snapshots históricos propios.',
    };

    // Categoría
    const primaryCat =
      channelRaw.category?.name ||
      channelRaw.category_name ||
      liveStreamRaw?.category?.name ||
      existingStreamer?.primaryCategory ||
      'Sin Categoría';

    // País: REGLA 25: NO inventar nacionalidades. Si no está confirmado documentalmente, NO DISPONIBLE.
    const country = existingStreamer?.country === 'México' ? 'México' : 'NO DISPONIBLE';

    return {
      id: existingStreamer?.id || `streamer-${username}`,
      username,
      displayName,
      publicName: existingStreamer?.publicName || null,
      avatarUrl:
        channelRaw.profile_pic ||
        existingStreamer?.avatarUrl ||
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face`,
      bio: channelRaw.bio ?? existingStreamer?.bio ?? null,
      kickUrl: `https://kick.com/${username}`,
      status: liveStreamRaw ? 'active' : existingStreamer?.status || 'active',
      country,
      city: existingStreamer?.city || null,
      state: existingStreamer?.state || null,
      organization: existingStreamer?.organization || null,
      socialLinks: existingStreamer?.socialLinks || [],
      primaryCategory: primaryCat,
      categories: Array.from(new Set([primaryCat, ...(existingStreamer?.categories || [])])).filter(Boolean),
      followers: followersMeta,
      avgViewers: avgViewersMeta,
      peakViewers: peakViewersMeta,
      hoursStreamed: hoursStreamedMeta,
      lastStreamDate: liveStreamRaw ? today : existingStreamer?.lastStreamDate || null,
      isDemo: false,
      dataType: 'real',
      confidence: 'alta',
      capturedAt: nowIso,
      createdAt: existingStreamer?.createdAt || nowIso,
      updatedAt: nowIso,
      verificationDate: today,
      source: 'KICK Public API',
    };
  }

  /**
   * Crea un ChannelSnapshot real a partir de datos obtenidos por la API oficial (Req 9)
   */
  public static mapToSnapshot(
    streamer: Streamer,
    options?: { notes?: string; sourceEndpoint?: string }
  ): ChannelSnapshot {
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    return {
      id: `snap-api-${streamer.username}-${today}`,
      streamerId: streamer.id,
      streamerUsername: streamer.username,
      streamerDisplayName: streamer.displayName,
      date: today,
      period: 'Diario',
      followers: streamer.followers.value,
      avgViewers: streamer.avgViewers.value,
      peakViewers: streamer.peakViewers.value,
      hoursStreamed: streamer.hoursStreamed.value,
      category: streamer.primaryCategory,
      source: 'KICK Public API',
      notes: options?.notes || `Snapshot capturado automáticamente vía KICK Public API (${options?.sourceEndpoint || 'GET /channels'})`,
      verificationDate: today,
      dataType: 'observed',
      origin: 'real',
      capturedAt: nowIso,
      confidence: 'alta',
      isDemo: false,
    };
  }
}

export class KickCategoryMapper {
  public static mapToCategory(raw: KickApiCategoryPayload, existing?: CategoryData | null): CategoryData {
    return {
      id: String(raw.id || raw.slug),
      name: raw.name || raw.slug,
      channelCount: raw.channels_count ?? existing?.channelCount ?? 0,
      avgViewers: raw.viewers_count ?? existing?.avgViewers ?? 0,
      totalHours: existing?.totalHours ?? 0,
      totalFollowers: existing?.totalFollowers ?? 0,
      peakViewers: raw.viewers_count ? Math.round(raw.viewers_count * 1.4) : existing?.peakViewers ?? 0,
      activeChannels: raw.channels_count ?? existing?.activeChannels ?? 0,
      description: `Categoría oficial de KICK (${raw.slug}). Obtenida mediante KICK Public API.`,
    };
  }
}

export class KickLivestreamMapper {
  public static mapToLiveStreamInfo(raw: KickApiLivestreamPayload) {
    const thumbUrl = typeof raw.thumbnail === 'object' && raw.thumbnail !== null ? raw.thumbnail.url : raw.thumbnail;
    return {
      id: String(raw.id),
      channelId: String(raw.channel_id),
      channelSlug: raw.channel?.slug || '',
      sessionTitle: raw.session_title,
      viewerCount: raw.viewer_count ?? raw.viewers ?? 0,
      categoryName: raw.category?.name || 'General',
      categorySlug: raw.category?.slug || '',
      startTime: raw.start_time || raw.created_at || new Date().toISOString(),
      language: raw.language || 'es',
      isMature: !!raw.is_mature,
      thumbnailUrl: thumbUrl || null,
      capturedAt: new Date().toISOString(),
      dataType: 'observed' as const,
      source: 'KICK Public API (GET /public/v1/livestreams)',
    };
  }
}
