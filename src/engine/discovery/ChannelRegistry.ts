/**
 * KICK ANALYTICS MX — CHANNEL REGISTRY (Fase 6, Req 12)
 * Registro centralizado de candidatos y canales descubiertos.
 * Impide duplicación de IDs y slugs, y persiste el catálogo de candidatos.
 */

import { DiscoveryCandidate, RegionalVerification } from '../../types';
import { appStorage } from '../../adapters/storage/StorageAdapter';
import { ChannelIdentityResolver } from './ChannelIdentityResolver';

const CANDIDATES_STORAGE_KEY = 'kick_analytics_mx_channel_candidates_v1';

export class ChannelRegistry {
  private static instance: ChannelRegistry;
  private candidates: DiscoveryCandidate[] = [];
  private isLoaded = false;
  private resolver = ChannelIdentityResolver.getInstance();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ChannelRegistry {
    if (!ChannelRegistry.instance) {
      ChannelRegistry.instance = new ChannelRegistry();
    }
    return ChannelRegistry.instance;
  }

  private async loadFromStorage(): Promise<void> {
    if (this.isLoaded || typeof window === 'undefined') return;
    try {
      const raw = await appStorage.getItem(CANDIDATES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.candidates = parsed;
        }
      }
      this.isLoaded = true;
    } catch {
      this.candidates = [];
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await appStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(this.candidates));
    } catch {}
  }

  public async getCandidates(): Promise<DiscoveryCandidate[]> {
    await this.loadFromStorage();
    return [...this.candidates];
  }

  /**
   * Agrega o actualiza un candidato impidiendo duplicados de ID o slug canónico
   */
  public async addOrUpdateCandidate(candidate: DiscoveryCandidate): Promise<boolean> {
    await this.loadFromStorage();

    const canonicalSlug = this.resolver.canonicalize(candidate.username);

    // Buscar si ya existe por ID oficial o username
    const existingIndex = this.candidates.findIndex(
      (c) =>
        (candidate.channelId && c.channelId === candidate.channelId) ||
        this.resolver.canonicalize(c.username) === canonicalSlug
    );

    if (existingIndex >= 0) {
      // Actualizar registro existente conservando verificaciones manuales previas
      const existing = this.candidates[existingIndex];
      this.candidates[existingIndex] = {
        ...candidate,
        id: existing.id,
        countryStatus: existing.countryStatus !== 'UNKNOWN' ? existing.countryStatus : candidate.countryStatus,
        regionalVerification: existing.regionalVerification || candidate.regionalVerification,
        lastSeen: new Date().toISOString(),
      };
    } else {
      this.candidates.push({
        ...candidate,
        username: canonicalSlug,
      });
    }

    await this.saveToStorage();
    return true;
  }

  /**
   * Actualiza la verificación regional de un candidato
   */
  public async updateRegionalVerification(
    candidateId: string,
    verification: RegionalVerification,
    state?: string
  ): Promise<boolean> {
    await this.loadFromStorage();

    const candidate = this.candidates.find((c) => c.id === candidateId);
    if (!candidate) return false;

    candidate.countryStatus = verification.status;
    candidate.regionalVerification = verification;
    if (state && verification.status === 'VERIFIED_MX') {
      candidate.notes = `Estado: ${state}. Verificado por ${verification.verifiedBy || 'Operador'}`;
    }

    await this.saveToStorage();
    return true;
  }

  /**
   * Elimina o descarta un candidato
   */
  public async removeCandidate(candidateId: string): Promise<boolean> {
    await this.loadFromStorage();
    this.candidates = this.candidates.filter((c) => c.id !== candidateId);
    await this.saveToStorage();
    return true;
  }
}

export const channelRegistry = ChannelRegistry.getInstance();
