/**
 * KICK ANALYTICS MX — Data Engine: Deduplicator
 * Detecta duplicidades entre registros existentes y entrantes antes de guardar o fusionar.
 * Regla: NUNCA sobrescribir silenciosamente.
 */

import { Streamer, ChannelSnapshot, DuplicateCandidate } from '../types';
import { Normalizer } from './Normalizer';

export class Deduplicator {
  /**
   * Comprueba si un streamer entrante ya existe en la colección activa
   */
  public static findStreamerDuplicate(
    incoming: Partial<Streamer>,
    existingList: Streamer[]
  ): DuplicateCandidate<Streamer> | null {
    if (!incoming.username) return null;
    const normIncomingUser = Normalizer.normalizeUsername(incoming.username);

    const match = existingList.find((ex) => {
      const normExistingUser = Normalizer.normalizeUsername(ex.username);
      if (normExistingUser === normIncomingUser) return true;
      if (incoming.id && ex.id === incoming.id) return true;
      return false;
    });

    if (!match) return null;

    return {
      id: `dup-str-${normIncomingUser}-${Date.now()}`,
      entityType: 'streamer',
      existingItem: match,
      incomingItem: incoming as Streamer,
      matchReason: `Mismo nombre de usuario verificado (@${normIncomingUser})`,
      streamerUsername: normIncomingUser,
      date: incoming.verificationDate || match.verificationDate,
    };
  }

  /**
   * Comprueba si un snapshot entrante ya existe en el histórico de un streamer
   */
  public static findSnapshotDuplicate(
    incoming: ChannelSnapshot,
    existingSnapshots: ChannelSnapshot[]
  ): DuplicateCandidate<ChannelSnapshot> | null {
    const incomingDate = Normalizer.normalizeDate(incoming.date || incoming.capturedAt);
    if (!incomingDate) return null;

    const match = existingSnapshots.find((ex) => {
      if (ex.streamerId !== incoming.streamerId) return false;
      const exDate = Normalizer.normalizeDate(ex.date || ex.capturedAt);
      if (exDate !== incomingDate) return false;

      // Misma fecha y mismo streamer
      if (ex.id === incoming.id) return true;
      if (ex.source?.toLowerCase().trim() === incoming.source?.toLowerCase().trim()) return true;
      return true;
    });

    if (!match) return null;

    return {
      id: `dup-snap-${incoming.streamerId}-${incomingDate}`,
      entityType: 'snapshot',
      existingItem: match,
      incomingItem: incoming,
      matchReason: `Mismo canal y misma fecha de observación (${incomingDate})`,
      streamerUsername: incoming.streamerId.replace(/^str-/, ''),
      date: incomingDate,
    };
  }

  /**
   * Fusiona de manera segura dos registros de streamer conservando los datos más completos y actualizados
   */
  public static mergeStreamers(existing: Streamer, incoming: Partial<Streamer>): Streamer {
    const updatedDate = new Date().toISOString();

    return {
      ...existing,
      ...incoming,
      id: existing.id,
      username: existing.username,
      displayName: incoming.displayName || existing.displayName,
      publicName: incoming.publicName !== undefined ? incoming.publicName : existing.publicName,
      bio: incoming.bio !== undefined ? incoming.bio : existing.bio,
      avatarUrl: incoming.avatarUrl || existing.avatarUrl,
      status: incoming.status || existing.status,
      country: incoming.country || existing.country,
      state: incoming.state !== undefined ? incoming.state : existing.state,
      city: incoming.city !== undefined ? incoming.city : existing.city,
      organization: incoming.organization !== undefined ? incoming.organization : existing.organization,
      socialLinks: incoming.socialLinks && incoming.socialLinks.length > 0 ? incoming.socialLinks : existing.socialLinks,
      primaryCategory: incoming.primaryCategory || existing.primaryCategory,
      categories: incoming.categories && incoming.categories.length > 0 ? incoming.categories : existing.categories,
      followers: incoming.followers?.value !== undefined && incoming.followers.value !== null ? incoming.followers : existing.followers,
      avgViewers: incoming.avgViewers?.value !== undefined && incoming.avgViewers.value !== null ? incoming.avgViewers : existing.avgViewers,
      peakViewers: incoming.peakViewers?.value !== undefined && incoming.peakViewers.value !== null ? incoming.peakViewers : existing.peakViewers,
      hoursStreamed: incoming.hoursStreamed?.value !== undefined && incoming.hoursStreamed.value !== null ? incoming.hoursStreamed : existing.hoursStreamed,
      lastStreamDate: incoming.lastStreamDate || existing.lastStreamDate,
      verificationDate: incoming.verificationDate || existing.verificationDate,
      source: incoming.source || existing.source,
      updatedAt: updatedDate,
    };
  }
}
