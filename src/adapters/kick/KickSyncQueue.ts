/**
 * KICK ANALYTICS MX — KICK SYNC QUEUE & RATE LIMITER (Fase 5, Reqs 10, 11)
 * Cola secuencial protegida para evitar saturación de peticiones y bloqueos por 429.
 * 
 * Flujo:
 * QUEUE → REQUEST → WAIT → NEXT
 */

import { KickApiClient } from './KickApiClient';
import { KickChannelMapper, KickApiChannelPayload, KickApiLivestreamPayload } from './KickMappers';
import { Streamer, ChannelSnapshot } from '../../types';
import { KickRateLimitError } from './KickErrors';

export interface SyncProgressItem {
  username: string;
  status: 'PENDING' | 'FETCHING' | 'SUCCESS' | 'ERROR' | 'SKIPPED';
  message?: string;
  channelData?: KickApiChannelPayload;
  liveData?: KickApiLivestreamPayload | null;
  mappedStreamer?: Streamer;
  mappedSnapshot?: ChannelSnapshot;
}

export interface SyncQueueProgressCallback {
  (current: number, total: number, item: SyncProgressItem): void;
}

export class KickSyncQueue {
  private client: KickApiClient;
  private delayBetweenRequestsMs: number = 600; // Margen de seguridad entre llamadas consecutivas

  constructor() {
    this.client = KickApiClient.getInstance();
  }

  /**
   * Procesa una lista de nombres de usuario uno a uno a través de la cola
   */
  public async processQueue(
    usernames: string[],
    existingStreamers: Streamer[],
    onProgress?: SyncQueueProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<{
    results: SyncProgressItem[];
    streamers: Streamer[];
    snapshots: ChannelSnapshot[];
    errors: string[];
  }> {
    const results: SyncProgressItem[] = [];
    const validStreamers: Streamer[] = [];
    const validSnapshots: ChannelSnapshot[] = [];
    const errors: string[] = [];

    const total = usernames.length;

    for (let i = 0; i < total; i++) {
      if (abortSignal?.aborted) {
        break;
      }

      const username = usernames[i].trim().toLowerCase();
      const existing = existingStreamers.find((s) => s.username.toLowerCase() === username) || null;

      const currentItem: SyncProgressItem = {
        username,
        status: 'FETCHING',
        message: 'Consultando KICK Public API...',
      };

      if (onProgress) {
        onProgress(i + 1, total, currentItem);
      }

      try {
        // 1. Consultar canal oficial
        const channelRaw = await this.client.getChannel(username);

        if (!channelRaw) {
          currentItem.status = 'ERROR';
          currentItem.message = `Canal @${username} no encontrado en KICK.`;
          errors.push(`@${username}: No encontrado en KICK (404).`);
        } else {
          // 2. Consultar si está transmitiendo en vivo (livestream)
          let liveRaw: KickApiLivestreamPayload | null = null;
          try {
            liveRaw = await this.client.getChannelLivestream(username);
          } catch {
            // No bloquear si el endpoint de livestreams falla temporalmente
          }

          // 3. Mapear a modelo interno
          const mappedStreamer = KickChannelMapper.mapToStreamer(channelRaw, liveRaw, existing);
          const mappedSnapshot = KickChannelMapper.mapToSnapshot(mappedStreamer, {
            notes: `Sincronización oficial KICK (${new Date().toLocaleTimeString()})`,
            sourceEndpoint: 'GET /public/v1/channels',
          });

          currentItem.status = 'SUCCESS';
          currentItem.channelData = channelRaw;
          currentItem.liveData = liveRaw;
          currentItem.mappedStreamer = mappedStreamer;
          currentItem.mappedSnapshot = mappedSnapshot;
          currentItem.message = 'Datos obtenidos exitosamente de KICK.';

          validStreamers.push(mappedStreamer);
          validSnapshots.push(mappedSnapshot);
        }
      } catch (err: unknown) {
        if (err instanceof KickRateLimitError) {
          currentItem.status = 'ERROR';
          currentItem.message = 'Límite de solicitudes alcanzado. Aplicando pausa de seguridad.';
          errors.push(`@${username}: Rate limit alcanzado en KICK.`);
          // Esperar backoff si es rate limit
          const waitTime = (err.retryAfterSeconds || 10) * 1000;
          await new Promise((r) => setTimeout(r, waitTime));
        } else {
          const errMsg = err instanceof Error ? err.message : String(err);
          currentItem.status = 'ERROR';
          currentItem.message = errMsg;
          errors.push(`@${username}: ${errMsg}`);
        }
      }

      results.push(currentItem);

      if (onProgress) {
        onProgress(i + 1, total, currentItem);
      }

      // Regla de espaciado obligatorio entre peticiones (QUEUE → REQUEST → WAIT → NEXT)
      if (i < total - 1) {
        await new Promise((r) => setTimeout(r, this.delayBetweenRequestsMs));
      }
    }

    return {
      results,
      streamers: validStreamers,
      snapshots: validSnapshots,
      errors,
    };
  }
}
