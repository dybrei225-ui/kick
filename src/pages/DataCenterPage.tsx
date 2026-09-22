import React, { useState, useEffect } from 'react';
import {
  Database,
  UploadCloud,
  History,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Download,
  Server,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Streamer, ChannelSnapshot, DataConnectionStatus, DataFreshnessStatus } from '../types';
import { calculateFreshness } from '../utils/math';
import { downloadCsvTemplate } from '../utils/csvTemplates';
import { formatNumber } from '../utils/formatters';

export const DataCenterPage: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<DataConnectionStatus>('NO_SOURCE');
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [snapshots, setSnapshots] = useState<ChannelSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const status = await dataService.getDataConnectionStatus();
      const st = await dataService.getStreamers();
      const sn = await dataService.getAllSnapshots();
      setConnectionStatus(status);
      setStreamers(st);
      setSnapshots(sn);
    } catch {
      // Error loading
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataService.subscribe(() => loadData());
    return () => unsub();
  }, []);

  // Calcular desglose de frescura de datos (Requerimiento 26)
  const freshnessCounts: Record<DataFreshnessStatus, number> = {
    ACTUALIZADO: 0,
    RECIENTE: 0,
    DESACTUALIZADO: 0,
    ANTIGUO: 0,
    'SIN DATOS': 0,
  };

  streamers.forEach((s) => {
    const f = calculateFreshness(s.verificationDate);
    freshnessCounts[f.status]++;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 mb-2">
            <Database className="w-3.5 h-3.5" /> REQUERIMIENTOS 21-26, 36 — CENTRO DE DATOS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            CENTRO DE DATOS Y CONEXIONES
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Estado de las fuentes, frescura temporal de los registros, gestión de almacén local y control de ingestión de KICK ANALYTICS MX.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/importador"
            className="flex items-center gap-2 px-4 py-2 bg-[#53FC18] hover:bg-[#46db13] text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-[#53FC18]/10 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Importar Nuevos Datos
          </a>
        </div>
      </div>

      {/* Banner de Estado de Conexión Oficial (Requerimiento 2, 3, 36) */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          connectionStatus === 'CONNECTED'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
            : connectionStatus === 'IMPORT'
            ? 'bg-sky-950/20 border-sky-500/40 text-sky-300'
            : connectionStatus === 'MANUAL'
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
            : 'bg-zinc-900 border-zinc-700 text-zinc-300'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'IMPORT'
                  ? 'bg-sky-400'
                  : connectionStatus === 'MANUAL'
                  ? 'bg-amber-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="font-mono font-bold text-xs uppercase tracking-wider text-white">
              ESTADO DEL MOTOR: {connectionStatus}
            </span>
          </div>

          <h2 className="text-base font-bold font-mono text-white">
            {connectionStatus === 'NO_SOURCE'
              ? 'CONEXIÓN AUTOMÁTICA NO CONFIGURADA'
              : connectionStatus === 'IMPORT'
              ? 'OPERANDO CON DATOS DE IMPORTACIÓN VERIFICADA'
              : connectionStatus === 'MANUAL'
              ? 'OPERANDO CON AUDITORÍA PÚBLICA Y REGISTRO MANUAL'
              : 'CONECTADO AL SISTEMA DE DATOS'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            KICK no dispone de una API oficial abierta de acceso público irrestricto. Esta plataforma no inventa datos ni simula falsas conexiones en segundo plano. Toda métrica proviene de contadores observados, archivos de importación validados o registros manuales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/metodologia"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 rounded-lg transition-colors"
          >
            Ver Metodología
          </a>
        </div>
      </div>

      {/* Tarjetas de volumen actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl">
          <span className="text-xs font-mono text-zinc-500 block">Canales Registrados</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {streamers.length}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            {streamers.filter((s) => s.isDemo).length} de demostración
          </span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl">
          <span className="text-xs font-mono text-zinc-500 block">Snapshots Históricos</span>
          <span className="text-2xl font-bold font-mono text-[#53FC18] mt-1 block">
            {snapshots.length}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">Puntos temporales</span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl">
          <span className="text-xs font-mono text-zinc-500 block">Seguidores Acumulados</span>
          <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">
            {formatNumber(streamers.reduce((acc, s) => acc + (s.followers?.value || 0), 0))}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">En canales observados</span>
        </div>

        <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl">
          <span className="text-xs font-mono text-zinc-500 block">Horas Transmitidas</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
            {formatNumber(streamers.reduce((acc, s) => acc + (s.hoursStreamed?.value || 0), 0))} h
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">Último período</span>
        </div>
      </div>

      {/* FRESCURA TEMPORAL DE LOS REGISTROS (Requerimiento 26) */}
      <div className="p-6 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-4">
        <div>
          <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#53FC18]" />
            FRESCURA TEMPORAL DE LOS DATOS (DATA FRESHNESS)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Clasificación de los canales según la antigüedad de su última fecha de observación o verificación.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 bg-[#0a0e10] border border-[#53FC18]/30 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#53FC18]">ACTUALIZADO</span>
              <span className="text-[10px] text-zinc-500 font-mono">≤ 3 días</span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {freshnessCounts.ACTUALIZADO}
            </span>
          </div>

          <div className="p-3 bg-[#0a0e10] border border-sky-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-sky-400">RECIENTE</span>
              <span className="text-[10px] text-zinc-500 font-mono">4 — 14 días</span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {freshnessCounts.RECIENTE}
            </span>
          </div>

          <div className="p-3 bg-[#0a0e10] border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400">DESACTUALIZADO</span>
              <span className="text-[10px] text-zinc-500 font-mono">15 — 60 días</span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {freshnessCounts.DESACTUALIZADO}
            </span>
          </div>

          <div className="p-3 bg-[#0a0e10] border border-rose-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-400">ANTIGUO</span>
              <span className="text-[10px] text-zinc-500 font-mono">&gt; 60 días</span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {freshnessCounts.ANTIGUO}
            </span>
          </div>

          <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-400">SIN DATOS</span>
              <span className="text-[10px] text-zinc-500 font-mono">Sin fecha</span>
            </div>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {freshnessCounts['SIN DATOS']}
            </span>
          </div>
        </div>
      </div>

      {/* ACCESOS DIRECTOS A MÓDULOS DE GESTIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/updates"
          className="p-5 bg-[#12191c] hover:bg-[#151e22] border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-white">Historial y Rollback</h4>
          <p className="text-xs text-zinc-400">
            Revisa los lotes importados, inspecciona cambios por canal y ejecuta reversiones seguras.
          </p>
        </a>

        <a
          href="/admin/storage"
          className="p-5 bg-[#12191c] hover:bg-[#151e22] border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-white">Almacenamiento e IndexedDB</h4>
          <p className="text-xs text-zinc-400">
            Monitorea el espacio ocupado, respalda la base de datos y migra a IndexedDB para grandes volúmenes.
          </p>
        </a>

        <a
          href="/admin/audit"
          className="p-5 bg-[#12191c] hover:bg-[#151e22] border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </div>
          <h4 className="text-sm font-bold font-mono text-white">Bitácora de Auditoría</h4>
          <p className="text-xs text-zinc-400">
            Consulta el registro de auditoría de acciones administrativas, operadores y marcas de tiempo.
          </p>
        </a>
      </div>
    </div>
  );
};
