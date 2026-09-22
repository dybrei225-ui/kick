/**
 * KICK ANALYTICS MX — PANEL DE CONECTORES (Fase 5, Reqs 13, 14, 15, 16, 17, 30, 31, 34)
 * Vista administrativa central para gestionar y monitorear la conexión oficial con KICK Public API.
 * Optimizado para Android (mobile-first) y escritorio.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Sliders,
  Play,
  FileText,
  Shield,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import { KickApiHealthCheck, HealthCheckResult } from '../adapters/kick/KickApiHealthCheck';
import { KickApiConfig, KickApiConfigData } from '../adapters/kick/KickApiConfig';
import { KickApiCapabilities, MetricCapabilityInfo } from '../adapters/kick/KickApiCapabilities';
import { KickSyncLogger, SyncExecutionLog } from '../adapters/kick/KickSyncLogger';
import { SyncProgressItem } from '../adapters/kick/KickSyncQueue';
import { IngestionPreviewResult } from '../engine/SyncManager';
import { dataService } from '../services/dataService';
import { Streamer } from '../types';

export const ConnectorsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [config, setConfig] = useState<KickApiConfigData>(KickApiConfig.getInstance().getConfig());
  const [syncLogs, setSyncLogs] = useState<SyncExecutionLog[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'capabilities' | 'logs' | 'config'>('status');

  // Modal states
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SyncExecutionLog | null>(null);

  // Form states for config
  const [clientIdInput, setClientIdInput] = useState(config.clientId);
  const [clientSecretInput, setClientSecretInput] = useState(
    KickApiConfig.getInstance().getSessionSecret() || ''
  );
  const [showSecret, setShowSecret] = useState(false);
  const [tokenInput, setTokenInput] = useState(KickApiConfig.getInstance().getAccessToken() || '');
  const [authMethodInput, setAuthMethodInput] = useState(config.authMethod);
  const [timeoutInput, setTimeoutInput] = useState(config.timeoutMs);
  const [retriesInput, setRetriesInput] = useState(config.maxRetries);
  const [cacheTtlInput, setCacheTtlInput] = useState(config.cacheTtlMs / 60000);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync execution states
  const [syncMode, setSyncMode] = useState<'single' | 'all' | 'custom'>('all');
  const [targetUsername, setTargetUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<'IDLE' | 'FETCHING' | 'PREVIEW' | 'COMMITTED'>('IDLE');
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; item?: SyncProgressItem }>({
    current: 0,
    total: 0,
  });
  const [previewResult, setPreviewResult] = useState<IngestionPreviewResult | null>(null);
  const [queueResults, setQueueResults] = useState<SyncProgressItem[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>>(
    new Map()
  );

  const loadInitialData = useCallback(async () => {
    const streamerList = await dataService.getStreamers();
    setStreamers(streamerList);
    const logs = await KickSyncLogger.getInstance().getLogs();
    setSyncLogs(logs);
    runHealthCheck();
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const res = await KickApiHealthCheck.runDiagnostics();
      setHealth(res);
    } catch {
      // Manejar error silenciosamente
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const configManager = KickApiConfig.getInstance();
    configManager.saveConfig({
      clientId: clientIdInput.trim(),
      authMethod: authMethodInput,
      timeoutMs: Number(timeoutInput),
      maxRetries: Number(retriesInput),
      cacheTtlMs: Number(cacheTtlInput) * 60000,
    });

    if (clientSecretInput) {
      configManager.setSessionSecret(clientSecretInput.trim());
    } else {
      configManager.setSessionSecret(null);
    }

    if (tokenInput) {
      configManager.setAccessToken(tokenInput.trim(), 3600);
    }

    setConfig(configManager.getConfig());
    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
      setIsConfigModalOpen(false);
      runHealthCheck();
    }, 1200);
  };

  // Ejecución de Sincronización Oficial
  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncStep('FETCHING');
    const realProvider = dataService.getRealProvider();

    let usernamesToSync: string[] = [];
    if (syncMode === 'single' && targetUsername.trim()) {
      usernamesToSync = [targetUsername.trim().toLowerCase()];
    } else if (syncMode === 'all') {
      usernamesToSync = streamers.length > 0 ? streamers.map((s) => s.username) : ['elded', 'lonche', 'westcol'];
    } else if (syncMode === 'custom' && targetUsername.trim()) {
      usernamesToSync = targetUsername
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }

    try {
      const prep = await realProvider.prepareSyncPreview(
        usernamesToSync,
        (current, total, item) => {
          setSyncProgress({ current, total, item });
        }
      );

      setQueueResults(prep.queueResults);
      setPreviewResult(prep.preview);

      // Si es individual o no hay conflictos, permitir commit
      const initialResolutions = new Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>();
      prep.preview.snapshotConflicts.forEach((c) => {
        initialResolutions.set(c.id, 'REPLACE'); // Default a reemplazo con dato nuevo de API
      });
      setConflictResolutions(initialResolutions);

      setSyncStep('PREVIEW');
    } catch (err: unknown) {
      alert(`Error durante la sincronización: ${err instanceof Error ? err.message : String(err)}`);
      setSyncStep('IDLE');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCommitSync = async () => {
    if (!previewResult) return;
    setIsSyncing(true);
    try {
      const realProvider = dataService.getRealProvider();
      await realProvider.commitSyncPreview(
        previewResult,
        conflictResolutions,
        syncMode === 'single' ? 'INDIVIDUAL' : 'MASSIVE'
      );
      setSyncStep('COMMITTED');
      // Recargar logs y datos
      const updatedLogs = await KickSyncLogger.getInstance().getLogs();
      setSyncLogs(updatedLogs);
      dataService.refresh();
      runHealthCheck();
    } catch (err: unknown) {
      alert(`Error al confirmar sincronización: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Formato de badge según estado
  const getStatusBadge = () => {
    if (!health) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
          <Clock className="w-3.5 h-3.5 animate-spin" /> Verificando...
        </span>
      );
    }
    switch (health.status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            <span className="w-2 h-2 rounded-full bg-[#53FC18] animate-pulse" /> KICK API: CONECTADA
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80">
            <AlertTriangle className="w-3.5 h-3.5" /> RATE LIMITED (429)
          </span>
        );
      case 'UNAUTHORIZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80">
            <Lock className="w-3.5 h-3.5" /> SIN AUTORIZACIÓN (401)
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
            <AlertTriangle className="w-3.5 h-3.5" /> NO CONFIGURADA
          </span>
        );
      case 'UNAVAILABLE':
      case 'ERROR':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800/80">
            <XCircle className="w-3.5 h-3.5" /> NO DISPONIBLE
          </span>
        );
    }
  };

  const capabilities = KickApiCapabilities.getAllCapabilities();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header con título y estado de conexión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#53FC18] flex items-center gap-1">
              <Server className="w-3.5 h-3.5" /> Módulo de Integración Oficial
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Panel de Conectores API
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Gestión, diagnóstico y sincronización transaccional con la API pública oficial de KICK (OAuth 2.1).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            onClick={runHealthCheck}
            disabled={checkingHealth}
            title="Probar conexión y medir latencia"
            className="p-2.5 rounded-lg bg-[#141a1d] hover:bg-[#1a2327] border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checkingHealth ? 'animate-spin text-[#53FC18]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjeta Principal del Conector KICK Public API */}
      <div className="bg-[#101518] rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#141a1d] to-[#101518]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/60 border border-zinc-700/80 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-[#53FC18]">K</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">KICK Public API</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">v1 Oficial</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Servidor API: <code className="text-zinc-300">{config.apiBaseUrl}</code> • OAuth:{' '}
                <code className="text-zinc-300">{config.authUrl}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#182024] hover:bg-[#202b30] border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              CONFIGURAR
            </button>
            <button
              onClick={runHealthCheck}
              disabled={checkingHealth}
              className="px-3.5 py-2 rounded-lg bg-[#182024] hover:bg-[#202b30] border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              PROBAR CONEXIÓN
            </button>
            <button
              onClick={() => {
                setSyncStep('IDLE');
                setPreviewResult(null);
                setIsSyncModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#53FC18] hover:bg-[#46db13] text-black text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              SINCRONIZAR
            </button>
          </div>
        </div>

        {/* Resumen de Métricas Operativas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-zinc-800/80 bg-[#0c1012]">
          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Estado Autenticación</p>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              {health?.isAuthOk ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#53FC18]" /> OK (OAuth 2.1)
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-zinc-500" /> No autenticado
                </>
              )}
            </p>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Latencia API</p>
            <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              {health?.latencyMs ? `${health.latencyMs} ms` : '---'}
            </p>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Última Comprobación</p>
            <p className="text-xs font-semibold text-zinc-300 mt-1">
              {health?.lastCheckedAt ? new Date(health.lastCheckedAt).toLocaleTimeString('es-MX') : '---'}
            </p>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Última Sincronización</p>
            <p className="text-xs font-semibold text-zinc-300 mt-1 truncate">
              {dataService.getProviderMetadata().lastSyncDate || 'Sin registro'}
            </p>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Streamers en Base</p>
            <p className="text-sm font-bold text-white mt-1">
              {streamers.length}{' '}
              <span className="text-[11px] font-normal text-zinc-400">canales</span>
            </p>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-medium text-zinc-400">Historial Syncs</p>
            <p className="text-sm font-bold text-white mt-1">
              {syncLogs.length}{' '}
              <span className="text-[11px] font-normal text-zinc-400">ejecuciones</span>
            </p>
          </div>
        </div>

        {/* Mensaje de Diagnóstico de Salud */}
        {health && (
          <div className="px-6 py-3 bg-[#12171a] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{health.diagnosticMessage}</span>
            </div>
            <span className="text-zinc-400 font-mono text-[11px]">
              Modo: {config.authMethod}
            </span>
          </div>
        )}
      </div>

      {/* Tabs de Navegación del Conector */}
      <div className="flex border-b border-zinc-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'status'
              ? 'border-[#53FC18] text-[#53FC18]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" /> Diagnóstico y Endpoints
        </button>
        <button
          onClick={() => setActiveTab('capabilities')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'capabilities'
              ? 'border-[#53FC18] text-[#53FC18]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Matriz de Capacidades
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-[#53FC18] text-[#53FC18]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Logs de Sincronización ({syncLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'config'
              ? 'border-[#53FC18] text-[#53FC18]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> Seguridad y Configuración
        </button>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Endpoints Oficiales Implementados */}
            <div className="bg-[#101518] rounded-xl border border-zinc-800 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#53FC18]" />
                Endpoints Oficiales Documentados
              </h3>
              <p className="text-xs text-zinc-400">
                La integración consulta únicamente los recursos públicos oficiales documentados en docs.kick.com.
              </p>
              <div className="space-y-2 font-mono text-xs">
                {KickApiCapabilities.getOfficialEndpoints().map((ep, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#0c1012] border border-zinc-800/80 text-zinc-300">
                    {ep}
                  </div>
                ))}
              </div>
            </div>

            {/* Política de Costos y Fallback */}
            <div className="bg-[#101518] rounded-xl border border-zinc-800 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Arquitectura de Costo $0 y Transparencia
              </h3>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3 rounded-lg bg-[#0c1012] border border-zinc-800">
                  <p className="font-semibold text-white mb-1">Costo Total: $0.00 MXN</p>
                  <p className="text-zinc-400">
                    No se utilizan proxies comerciales de pago, servicios externos de scraping ni bases de datos de pago.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#0c1012] border border-zinc-800">
                  <p className="font-semibold text-white mb-1">Protección Anti-Scraping y Rate Limiting</p>
                  <p className="text-zinc-400">
                    El cliente respeta estrictamente los códigos HTTP 429 aplicando backoff exponencial con jitter. Nunca se intenta evadir protecciones ni CAPTCHA.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#0c1012] border border-zinc-800">
                  <p className="font-semibold text-white mb-1">Principio Transaccional</p>
                  <p className="text-zinc-400">
                    READ → VALIDATE → PREPARE → PREVIEW → CONFIRM → COMMIT mediante SyncManager.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'capabilities' && (
        <div className="bg-[#101518] rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-zinc-800 bg-[#141a1d]">
            <h3 className="text-sm font-bold text-white">Matriz Oficial de Métricas y Capacidades</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Distingue inequívocamente qué métricas son provistas por la API de KICK, cuáles son calculadas y cuáles permanecen como NO DISPONIBLE.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1012] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Métrica / Recurso</th>
                  <th className="py-3 px-4">Estado Oficial</th>
                  <th className="py-3 px-4">Endpoint Documentado</th>
                  <th className="py-3 px-4">Aviso de Transparencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {capabilities.map((cap) => (
                  <tr key={cap.key} className="hover:bg-[#141a1d]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {cap.name}
                      <p className="text-[11px] font-normal text-zinc-400 mt-0.5">{cap.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      {cap.status === 'available' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold text-[10px]">
                          OBSERVADO (API)
                        </span>
                      )}
                      {cap.status === 'calculated_locally' && (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold text-[10px]">
                          CALCULADO INTERNO
                        </span>
                      )}
                      {cap.status === 'unavailable' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold text-[10px]">
                          NO DISPONIBLE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">
                      {cap.officialSourceEndpoint || 'Ninguno (No provisto)'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px] max-w-xs">
                      {cap.transparencyNotice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Historial de Sincronizaciones</h3>
            <button
              onClick={async () => {
                await KickSyncLogger.getInstance().clearLogs();
                setSyncLogs([]);
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Limpiar registros
            </button>
          </div>

          {syncLogs.length === 0 ? (
            <div className="bg-[#101518] rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-zinc-400">Sin historial de sincronización registrado</p>
              <p className="text-xs text-zinc-500 mt-1">
                Presione &quot;SINCRONIZAR&quot; para realizar la primera captura oficial.
              </p>
            </div>
          ) : (
            <div className="bg-[#101518] rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0c1012] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">ID Ejecución</th>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Peticiones</th>
                      <th className="py-3 px-4">Éxitos / Errores</th>
                      <th className="py-3 px-4">Nuevos / Actualizados</th>
                      <th className="py-3 px-4">Duración</th>
                      <th className="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {syncLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-[#141a1d] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#53FC18]">{log.id}</td>
                        <td className="py-3 px-4 text-zinc-300">
                          {log.date} {new Date(log.startTime).toLocaleTimeString('es-MX')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">{log.requestsCount}</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-semibold">{log.successesCount}</span> /{' '}
                          <span className={log.errorsCount > 0 ? 'text-red-400 font-semibold' : 'text-zinc-500'}>
                            {log.errorsCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          +{log.newRecordsCount} / ~{log.updatedRecordsCount}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{log.durationMs} ms</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : log.status === 'PARTIAL'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-[#101518] rounded-xl border border-zinc-800 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#53FC18]" />
              Seguridad y Credenciales de la Integración
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Las credenciales oficiales se manejan con aislamiento de memoria para prevenir fugas en el cliente.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 text-xs text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <Shield className="w-4 h-4" /> CONEXIÓN API REQUIERE ENTORNO SEGURO PARA CREDENCIALES
            </div>
            <p className="text-amber-300/90 leading-relaxed">
              En estricto apego al Requerimiento 3 y directrices de OAuth 2.1, el <strong>Client Secret</strong> jamás
              se almacena en <code>localStorage</code>, <code>IndexedDB</code> ni archivos JSON exportables.
              Si se introduce en esta sesión, permanecerá exclusivamente en memoria RAM volátil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#0c1012] border border-zinc-800 space-y-1">
              <p className="font-semibold text-white">Client ID Registrado</p>
              <p className="font-mono text-zinc-400">{config.clientId ? config.clientId : '(No configurado)'}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0c1012] border border-zinc-800 space-y-1">
              <p className="font-semibold text-white">Client Secret (Sesión)</p>
              <p className="font-mono text-zinc-400">
                {KickApiConfig.getInstance().hasSessionSecret() ? '******** (En memoria)' : '(No introducido)'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#0c1012] border border-zinc-800 space-y-1">
              <p className="font-semibold text-white">Método de Autenticación</p>
              <p className="font-mono text-zinc-400">{config.authMethod}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0c1012] border border-zinc-800 space-y-1">
              <p className="font-semibold text-white">Caché TTL en Memoria</p>
              <p className="font-mono text-zinc-400">{config.cacheTtlMs / 60000} minutos</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#182024] hover:bg-[#202b30] border border-zinc-700 text-xs font-bold text-white flex items-center gap-2"
            >
              <Sliders className="w-4 h-4 text-[#53FC18]" />
              Modificar Parámetros de Conexión
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101518] rounded-xl border border-zinc-800 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#53FC18]" /> Configuración de KICK API
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Método de Autenticación</label>
                <select
                  value={authMethodInput}
                  onChange={(e) => setAuthMethodInput(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white"
                >
                  <option value="client_credentials">OAuth 2.1 Client Credentials (id.kick.com)</option>
                  <option value="bearer_token">Bearer Access Token Manual</option>
                  <option value="backend_proxy">Backend Proxy Seguro (/api/kick)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Client ID Oficial</label>
                <input
                  type="text"
                  placeholder="Obtenido en kick.com/settings/developer"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white font-mono"
                />
              </div>

              {authMethodInput === 'client_credentials' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold">Client Secret (Sesión Volátil)</label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Solo en memoria RAM (No persistido en disco)"
                    value={clientSecretInput}
                    onChange={(e) => setClientSecretInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Garantía: Nunca se escribirá en almacenamiento local.
                  </p>
                </div>
              )}

              {authMethodInput === 'bearer_token' && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bearer Access Token</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    value={timeoutInput}
                    onChange={(e) => setTimeoutInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Reintentos</label>
                  <input
                    type="number"
                    value={retriesInput}
                    onChange={(e) => setRetriesInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Caché TTL (min)</label>
                  <input
                    type="number"
                    value={cacheTtlInput}
                    onChange={(e) => setCacheTtlInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white"
                  />
                </div>
              </div>

              {saveSuccessNotice && (
                <div className="p-3 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-center font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Configuración actualizada de forma segura
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#53FC18] hover:bg-[#46db13] text-black font-bold"
                >
                  Guardar Parámetros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SINCRONIZACIÓN Y PREVISUALIZACIÓN */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101518] rounded-xl border border-zinc-800 max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-[#53FC18] fill-current" /> Sincronización Oficial KICK API
              </h3>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              {syncStep === 'IDLE' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-2">Alcance de la Sincronización</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setSyncMode('all')}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          syncMode === 'all'
                            ? 'bg-[#182024] border-[#53FC18] text-white'
                            : 'bg-[#0c1012] border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <p className="font-bold text-white">Todos los Canales</p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {streamers.length} canales existentes en cola secuencial protegida.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSyncMode('single')}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          syncMode === 'single'
                            ? 'bg-[#182024] border-[#53FC18] text-white'
                            : 'bg-[#0c1012] border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <p className="font-bold text-white">Canal Individual</p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Consulta puntual de un solo username.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSyncMode('custom')}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          syncMode === 'custom'
                            ? 'bg-[#182024] border-[#53FC18] text-white'
                            : 'bg-[#0c1012] border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <p className="font-bold text-white">Lista Personalizada</p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Varios canales separados por coma.
                        </p>
                      </button>
                    </div>
                  </div>

                  {(syncMode === 'single' || syncMode === 'custom') && (
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        {syncMode === 'single' ? 'Username del canal en KICK' : 'Usernames separados por coma'}
                      </label>
                      <input
                        type="text"
                        placeholder={syncMode === 'single' ? 'ej. elded' : 'ej. elded, lonche, westcol'}
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0c1012] border border-zinc-700 text-white font-mono"
                      />
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 space-y-1">
                    <p className="text-zinc-300 font-semibold">Protección de Cola Activa (Rate Limiting)</p>
                    <p>
                      Las solicitudes se procesan en cola con pausas controladas para evitar bloqueos HTTP 429.
                      Antes de guardar cualquier dato se presentará una PREVISUALIZACIÓN detallada.
                    </p>
                  </div>
                </div>
              )}

              {syncStep === 'FETCHING' && (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#53FC18] mx-auto" />
                  <p className="text-sm font-bold text-white">
                    Consultando KICK Public API ({syncProgress.current} de {syncProgress.total})
                  </p>
                  <p className="text-xs text-zinc-400">
                    {syncProgress.item ? `@${syncProgress.item.username}: ${syncProgress.item.message}` : 'Procesando cola...'}
                  </p>
                </div>
              )}

              {syncStep === 'PREVIEW' && previewResult && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0c1012] border border-zinc-800 space-y-2">
                    <h4 className="text-sm font-bold text-white">PREVISUALIZACIÓN DE SINCRONIZACIÓN</h4>
                    <p className="text-zinc-400 text-xs">
                      {previewResult.totalRecords} registros procesados mediante KICK Public API.
                    </p>
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <p className="text-lg font-bold text-emerald-400">{previewResult.newCount}</p>
                        <p className="text-[10px] text-zinc-400">Nuevos</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <p className="text-lg font-bold text-cyan-400">{previewResult.updatedCount}</p>
                        <p className="text-[10px] text-zinc-400">Actualizados</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <p className="text-lg font-bold text-zinc-400">{previewResult.unchangedCount}</p>
                        <p className="text-[10px] text-zinc-400">Sin Cambios</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <p className="text-lg font-bold text-red-400">{previewResult.errorCount}</p>
                        <p className="text-[10px] text-zinc-400">Errores</p>
                      </div>
                    </div>
                  </div>

                  {/* Resultados por canal */}
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="bg-zinc-900 px-3 py-2 font-semibold text-zinc-300 text-xs">
                      Detalle de Respuesta por Streamer
                    </div>
                    <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
                      {queueResults.map((r, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                          <span className="font-mono text-zinc-200 font-semibold">@{r.username}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              r.status === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {r.status === 'SUCCESS' ? 'Datos Obtenidos' : r.message || 'Error'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {previewResult.snapshotConflicts.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800 text-xs text-amber-300 space-y-2">
                      <p className="font-bold">Colisión de Snapshots Detectada ({previewResult.snapshotConflicts.length})</p>
                      <p className="text-zinc-400">
                        Ya existen capturas para la misma fecha. Se aplicará la regla REPLACE (reemplazar con datos observados oficiales).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {syncStep === 'COMMITTED' && (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-[#53FC18] mx-auto" />
                  <p className="text-base font-bold text-white">Sincronización Confirmada y Almacenada</p>
                  <p className="text-xs text-zinc-400">
                    Los snapshots y métricas observadas han sido registradas en la base de datos oficial.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              {syncStep === 'IDLE' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSyncModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSync}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-lg bg-[#53FC18] hover:bg-[#46db13] text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    Iniciar Consulta a KICK
                  </button>
                </>
              )}

              {syncStep === 'PREVIEW' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSyncStep('IDLE')}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitSync}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-lg bg-[#53FC18] hover:bg-[#46db13] text-black font-bold text-xs"
                  >
                    Confirmar e Ingerir Snapshots (COMMIT)
                  </button>
                </>
              )}

              {syncStep === 'COMMITTED' && (
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#53FC18] hover:bg-[#46db13] text-black font-bold text-xs"
                >
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE LOG */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101518] rounded-xl border border-zinc-800 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">{selectedLog.id}</h3>
              <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-white text-sm">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs text-zinc-300 font-mono">
              <p>Fecha: {selectedLog.date}</p>
              <p>Tipo: {selectedLog.type}</p>
              <p>Duración: {selectedLog.durationMs} ms</p>
              <p>Peticiones: {selectedLog.requestsCount}</p>
              <p>Éxitos: {selectedLog.successesCount}</p>
              <p>Errores: {selectedLog.errorsCount}</p>
              <p>Nuevos: {selectedLog.newRecordsCount}</p>
              <p>Actualizados: {selectedLog.updatedRecordsCount}</p>
              <p>Omitidos: {selectedLog.skippedRecordsCount}</p>
              {selectedLog.errorMessages.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded text-red-300">
                  <p className="font-bold mb-1">Mensajes de Error:</p>
                  {selectedLog.errorMessages.map((m, idx) => (
                    <p key={idx}>{m}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
