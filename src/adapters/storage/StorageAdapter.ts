/**
 * KICK ANALYTICS MX — STORAGE ADAPTER ARCHITECTURE (Fase 4, Reqs 18, 19, 20)
 * Capa de abstracción de persistencia desacoplada del navegador.
 * Soporta LocalStorageAdapter e IndexedDBAdapter (preparación futura sin ruptura).
 */

import { StorageStats } from '../../types';

export interface StorageAdapter {
  getName(): 'LOCAL_STORAGE' | 'INDEXED_DB';
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  getKeys(): Promise<string[]>;
  estimateSizeKb(): Promise<number>;
  isAvailable(): Promise<boolean>;
}

/**
 * Implementación actual basada en localStorage con protección contra límites de cuota
 */
export class LocalStorageAdapter implements StorageAdapter {
  getName(): 'LOCAL_STORAGE' {
    return 'LOCAL_STORAGE';
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const testKey = '__kick_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.warn(`[LocalStorageAdapter] Error al leer clave: ${key}`, err);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err: any) {
      console.error(`[LocalStorageAdapter] Error de escritura (posible cuota excedida) para clave: ${key}`, err);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[LocalStorageAdapter] Error al eliminar clave: ${key}`, err);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const keys = await this.getKeys();
      for (const k of keys) {
        if (k.startsWith('kick_analytics_mx_')) {
          window.localStorage.removeItem(k);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async getKeys(): Promise<string[]> {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    } catch {
      return [];
    }
  }

  async estimateSizeKb(): Promise<number> {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    try {
      let totalBytes = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('kick_analytics_mx_')) {
          const val = window.localStorage.getItem(k) || '';
          totalBytes += (k.length + val.length) * 2; // UTF-16
        }
      }
      return Math.round((totalBytes / 1024) * 10) / 10;
    } catch {
      return 0;
    }
  }
}

/**
 * Implementación preparada para IndexedDB (Requerimiento 19)
 * No activada por defecto para preservar compatibilidad y datos existentes,
 * lista para migración segura con verificación previa y rollback.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'kick_analytics_mx_idb';
  private storeName = 'app_keyval_store';
  private dbPromise: Promise<IDBDatabase> | null = null;

  getName(): 'INDEXED_DB' {
    return 'INDEXED_DB';
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.indexedDB) return false;
    try {
      const db = await this.getDB();
      return !!db;
    } catch {
      return false;
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB no está disponible en este entorno'));
      }
      const req = window.indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async getKeys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async estimateSizeKb(): Promise<number> {
    try {
      const keys = await this.getKeys();
      let totalBytes = 0;
      for (const k of keys) {
        const val = await this.getItem(k);
        if (val) totalBytes += (k.length + val.length) * 2;
      }
      return Math.round((totalBytes / 1024) * 10) / 10;
    } catch {
      return 0;
    }
  }
}

/**
 * Gestor unificado de almacenamiento de la aplicación (Singleton)
 */
class AppStorageManager {
  private adapter: StorageAdapter;
  private localAdapter = new LocalStorageAdapter();
  private indexedDbAdapter = new IndexedDBAdapter();

  constructor() {
    // Por defecto inicia con LocalStorage para garantizar 100% de compatibilidad
    this.adapter = this.localAdapter;
  }

  public getAdapter(): StorageAdapter {
    return this.adapter;
  }

  public async getItem(key: string): Promise<string | null> {
    return this.adapter.getItem(key);
  }

  public async setItem(key: string, value: string): Promise<boolean> {
    return this.adapter.setItem(key, value);
  }

  public async removeItem(key: string): Promise<boolean> {
    return this.adapter.removeItem(key);
  }

  public async clear(): Promise<boolean> {
    return this.adapter.clear();
  }

  public async getKeys(): Promise<string[]> {
    return this.adapter.getKeys();
  }

  public async isIndexedDbAvailable(): Promise<boolean> {
    return this.indexedDbAdapter.isAvailable();
  }

  public async getStorageStats(): Promise<StorageStats> {
    const isIdbSupported = await this.indexedDbAdapter.isAvailable();
    const sizeKb = await this.adapter.estimateSizeKb();
    const keys = await this.adapter.getKeys();
    const appKeys = keys.filter((k) => k.startsWith('kick_analytics_mx_'));

    const streamersRaw = await this.adapter.getItem('kick_analytics_mx_streamers_v1');
    const snapshotsRaw = await this.adapter.getItem('kick_analytics_mx_snapshots_v1');
    const changesRaw = await this.adapter.getItem('kick_analytics_mx_change_logs_v1');
    const jobsRaw = await this.adapter.getItem('kick_analytics_mx_import_jobs_v1');
    const lastBackup = await this.adapter.getItem('kick_analytics_mx_last_backup_at');

    const streamers = streamersRaw ? JSON.parse(streamersRaw) : [];
    const snapshots = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];
    const changes = changesRaw ? JSON.parse(changesRaw) : [];
    const jobs = jobsRaw ? JSON.parse(jobsRaw) : [];

    return {
      type: this.adapter.getName(),
      activeAdapter: this.adapter.getName(),
      recordCount: appKeys.length,
      itemCount: appKeys.length,
      quotaPercent: Math.min(100, Math.round((sizeKb / 5120) * 100)),
      estimatedSizeKb: sizeKb,
      isIndexedDbSupported: isIdbSupported,
      streamersCount: Array.isArray(streamers) ? streamers.length : 0,
      snapshotsCount: Array.isArray(snapshots) ? snapshots.length : 0,
      changesCount: Array.isArray(changes) ? changes.length : 0,
      importJobsCount: Array.isArray(jobs) ? jobs.length : 0,
      lastBackupAt: lastBackup || null,
    };
  }

  /**
   * Migración segura a IndexedDB (Requerimiento 20)
   * 1. Copia todas las claves a IndexedDB
   * 2. Verifica integridad de lectura
   * 3. Solo si es 100% exitoso, activa IndexedDBAdapter
   * 4. NO elimina localStorage para servir de respaldo de emergencia
   */
  public async migrateToIndexedDb(): Promise<{
    success: boolean;
    migratedKeys: number;
    error?: string;
  }> {
    const isIdb = await this.indexedDbAdapter.isAvailable();
    if (!isIdb) {
      return { success: false, migratedKeys: 0, error: 'IndexedDB no está disponible en este navegador.' };
    }

    try {
      const localKeys = await this.localAdapter.getKeys();
      const appKeys = localKeys.filter((k) => k.startsWith('kick_analytics_mx_'));
      let migratedCount = 0;

      for (const k of appKeys) {
        const value = await this.localAdapter.getItem(k);
        if (value !== null) {
          const ok = await this.indexedDbAdapter.setItem(k, value);
          if (!ok) {
            return {
              success: false,
              migratedKeys: migratedCount,
              error: `Error al escribir la clave ${k} en IndexedDB. Migración abortada.`,
            };
          }
          // Verificar lectura
          const readBack = await this.indexedDbAdapter.getItem(k);
          if (readBack !== value) {
            return {
              success: false,
              migratedKeys: migratedCount,
              error: `Discrepancia de verificación en clave ${k}. Migración cancelada.`,
            };
          }
          migratedCount++;
        }
      }

      // Activar IndexedDB
      this.adapter = this.indexedDbAdapter;
      return { success: true, migratedKeys: migratedCount };
    } catch (e: any) {
      return { success: false, migratedKeys: 0, error: e?.message || 'Error inesperado durante la migración.' };
    }
  }

  public switchToLocalStorage() {
    this.adapter = this.localAdapter;
  }
}

export const appStorage = new AppStorageManager();
