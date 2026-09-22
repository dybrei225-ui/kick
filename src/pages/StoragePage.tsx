import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Database,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  Server,
  Trash2,
} from 'lucide-react';
import { appStorage } from '../adapters/storage/StorageAdapter';
import { StorageStats } from '../types';
import { dataService } from '../services/dataService';

export const StoragePage: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const s = await appStorage.getStorageStats();
      setStats(s);
    } catch {
      // Error loading stats
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleMigrate = async () => {
    if (stats?.activeAdapter === 'INDEXED_DB') {
      alert('IndexedDB ya se encuentra activo como motor de almacenamiento.');
      return;
    }

    const confirm = window.confirm(
      '¿Deseas migrar la persistencia a IndexedDB?\n\nSe realizará una prueba de lectura y escritura antes de activar el adaptador para garantizar la integridad sin pérdida de datos.'
    );
    if (!confirm) return;

    setIsMigrating(true);
    setMigrationStatus(null);

    try {
      const result = await appStorage.migrateToIndexedDb();
      setMigrationStatus(result);
      await loadStats();
      dataService.notifyListeners();
    } catch (e: any) {
      setMigrationStatus({
        success: false,
        message: `Fallo durante el proceso de migración: ${e?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleExportFullBackup = async () => {
    const streamers = await dataService.getStreamers();
    const snapshots = await dataService.getAllSnapshots();
    const categories = await dataService.getCategories();
    const jobs = await dataService.sync.getImportJobs();
    const changeLogs = await dataService.sync.getChangeLogs();

    const backup = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      platform: 'KICK ANALYTICS MX',
      streamers,
      snapshots,
      categories,
      jobs,
      changeLogs,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kick_analytics_mx_backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
            <HardDrive className="w-3.5 h-3.5" /> REQUERIMIENTOS 18, 19, 20 — PERSISTENCIA
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            ADMINISTRACIÓN DE ALMACENAMIENTO
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Monitoreo de cuota, integridad del almacenamiento local y migración segura a IndexedDB sin dependencias de servicios de pago.
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar estado
        </button>
      </div>

      {/* Alerta de migración */}
      {migrationStatus && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            migrationStatus.success
              ? 'bg-[#12191c] border-[#53FC18]/50 text-[#53FC18]'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {migrationStatus.success ? (
            <CheckCircle2 className="w-5 h-5 text-[#53FC18] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-bold block text-sm">
              {migrationStatus.success ? 'Migración completada' : 'Error en la migración'}
            </span>
            <p className="font-mono mt-0.5">{migrationStatus.message}</p>
          </div>
        </div>
      )}

      {/* Tarjetas de estadísticas de almacenamiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Adaptador Activo</span>
            <Database className="w-4 h-4 text-[#53FC18]" />
          </div>
          <span className="text-lg font-bold font-mono text-white block">
            {stats?.activeAdapter || 'LOCAL_STORAGE'}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {stats?.activeAdapter === 'INDEXED_DB' ? 'Alta capacidad asíncrona' : 'Síncrono estándar'}
          </span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Espacio Estimado</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-lg font-bold font-mono text-white block">
            {stats ? `${stats.estimatedSizeKb.toLocaleString()} KB` : '0 KB'}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {stats ? `~${(stats.estimatedSizeKb / 1024).toFixed(2)} MB en uso` : ''}
          </span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Llaves en Almacén</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-lg font-bold font-mono text-white block">
            {stats?.itemCount ?? 0} colecciones
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">Canales, snapshots, logs</span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Uso de Cuota</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-lg font-bold font-mono text-white block">
            {stats?.quotaPercent ? `${stats.quotaPercent}%` : '< 5%'}
          </span>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
            <div
              className="bg-[#53FC18] h-full rounded-full"
              style={{ width: `${Math.min(stats?.quotaPercent || 2, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* MÓDULO DE MIGRACIÓN A INDEXEDDB */}
      <div className="p-6 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#53FC18]" />
              MIGRACIÓN DE PERSISTENCIA
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Permite transferir de forma transparente todos los canales, históricos de snapshots y bitácoras de cambios de LocalStorage a IndexedDB para soportar mayores volúmenes sin límite de 5 MB.
            </p>
          </div>

          <button
            onClick={handleMigrate}
            disabled={isMigrating || stats?.activeAdapter === 'INDEXED_DB'}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-colors ${
              stats?.activeAdapter === 'INDEXED_DB'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-[#53FC18] hover:bg-[#46db13] text-black shadow-lg shadow-[#53FC18]/10'
            }`}
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                VERIFICANDO INTEGRIDAD...
              </>
            ) : stats?.activeAdapter === 'INDEXED_DB' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#53FC18]" />
                INDEXEDDB YA ACTIVO
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                MIGRAR A INDEXEDDB
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl space-y-1">
            <span className="font-bold font-mono text-white block">LocalStorage (Por defecto)</span>
            <p className="text-zinc-400">
              Persistencia síncrona en el navegador. Límite estándar de ~5MB. Ideal para configuraciones iniciales y hasta 1,000 registros sin snapshots masivos.
            </p>
          </div>
          <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl space-y-1">
            <span className="font-bold font-mono text-white block">IndexedDB (Recomendado para históricos)</span>
            <p className="text-zinc-400">
              Motor estructurado asíncrono. Soporta cientos de megabytes de snapshots cronológicos sin degradar el rendimiento de la interfaz.
            </p>
          </div>
        </div>
      </div>

      {/* RESPALDOS Y SEGURIDAD */}
      <div className="p-6 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
          RESPALDOS Y EXPORTACIÓN COMPLETA
        </h2>
        <p className="text-xs text-zinc-400">
          Descarga una copia completa de la base de datos en formato JSON para custodia fuera del navegador o para transferir a otro equipo.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportFullBackup}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-mono flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-[#53FC18]" />
            Descargar Respaldo JSON Completo
          </button>
        </div>
      </div>
    </div>
  );
};
