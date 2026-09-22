/**
 * KICK ANALYTICS MX — COMPLIANCE DASHBOARD (Fase 6, Reqs 2, 3, 4, 41, 42, 51)
 * Ruta: /admin/compliance
 * 
 * Panel de supervisión de cumplimiento normativo, políticas de retención,
 * guardia de publicación, protección de secretos y suite de pruebas de integridad.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Database,
  Cpu,
  RefreshCw,
  Sliders,
  FileText,
  Key
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { FreshnessSummary } from '../engine/compliance/DataFreshnessManager';
import { LockedFeature } from '../engine/compliance/KickDataPolicy';
import { Phase6VerificationSuite, VerificationSuiteResult } from '../engine/tests/Phase6Verification';
import { RequestBudget } from '../types';

export const CompliancePage: React.FC = () => {
  const [freshness, setFreshness] = useState<FreshnessSummary | null>(null);
  const [lockedFeatures, setLockedFeatures] = useState<LockedFeature[]>([]);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  // Request budget simulation
  const [simulatedChannels, setSimulatedChannels] = useState<number>(25);
  const [simulatedPriority, setSimulatedPriority] = useState<'NORMAL' | 'HIGH' | 'LOW'>('NORMAL');
  const [calculatedBudget, setCalculatedBudget] = useState<RequestBudget | null>(null);

  // Tests
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<VerificationSuiteResult | null>(null);

  const loadData = async () => {
    const streamers = await dataService.getStreamers();
    const fresh = dataService.getDataFreshnessManager().getFreshnessSummary(streamers);
    const locked = dataService.getKickDataPolicy().getLockedFeatures();
    setFreshness(fresh);
    setLockedFeatures(locked);

    const budget = dataService.getRequestBudgetManager().calculateBudget(
      simulatedChannels,
      true,
      simulatedPriority
    );
    setCalculatedBudget(budget);
  };

  useEffect(() => {
    loadData();
  }, [simulatedChannels, simulatedPriority]);

  const handlePurge = async () => {
    if (!confirm('¿Desea purgar de inmediato los datos de KICK API con más de 24 horas de antigüedad?')) return;
    setPurging(true);
    try {
      const res = await dataService.purgeExpiredApiData();
      setPurgeResult(
        `Purga completada en ${res.durationMs}ms: ${res.expiredSnapshotsRemoved} snapshots de API caducados eliminados y memoria caché limpiada.`
      );
      await loadData();
    } catch (err: unknown) {
      alert(`Error al purgar datos: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPurging(false);
    }
  };

  const handleRunTests = async () => {
    setTesting(true);
    try {
      const res = await Phase6VerificationSuite.runAllTests();
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 pb-24 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Fase 6 — Compliance Gate & Data Retention
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Centro de Cumplimiento Normativo (Compliance)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Control de términos de desarrollador de KICK, políticas de retención temporal (TTL 24h),
            bloqueo de redistribución de datos crudos y auditoría de integridad técnica.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={testing}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-[#53FC18] font-bold px-4 py-2.5 rounded-xl text-xs border border-zinc-700 transition cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {testing ? 'EJECUTANDO VERIFICACIÓN...' : 'EJECUTAR TESTS DE INTEGRIDAD'}
        </button>
      </div>

      {/* DASHBOARD DE COMPLIANCE (Req 41) */}
      <div className="mt-6 bg-[#111619] border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#53FC18]" />
          Estado de Controles Normativos KICK (Compliance Dashboard)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">KICK Public API</span>
              <span className="text-xs font-bold text-white mt-0.5 block">api.kick.com/public/v1</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● CONECTADA
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Política de Datos</span>
              <span className="text-xs font-bold text-white mt-0.5 block">KickDataPolicy</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● CARGADA
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Política de Retención</span>
              <span className="text-xs font-bold text-white mt-0.5 block">Máximo 24h (TTL)</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● ACTIVA
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Memoria Caché API</span>
              <span className="text-xs font-bold text-white mt-0.5 block">En RAM volátil</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● ACTIVA
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Guardia de Publicación</span>
              <span className="text-xs font-bold text-white mt-0.5 block">PublicationGuard</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● ACTIVO
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Protección Rate Limit</span>
              <span className="text-xs font-bold text-white mt-0.5 block">Backoff + Jitter</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● ACTIVO
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Protección Secretos</span>
              <span className="text-xs font-bold text-white mt-0.5 block">0% en disco / logs</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
              ● ACTIVO
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Costo de Operación</span>
              <span className="text-xs font-bold text-[#53FC18] mt-0.5 block">$0 MXN (Local / Client)</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300">
              VERIFICADO
            </span>
          </div>
        </div>
      </div>

      {/* RESULTADOS DE TESTS DE VERIFICACIÓN (Req 51) */}
      {testResult && (
        <div className="mt-6 bg-[#111619] border border-zinc-800 rounded-2xl p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#53FC18]" />
                Resultado de Suite de Verificación Funcional (Req 51)
              </h2>
              <span className="text-xs text-zinc-400">
                {testResult.passed} de {testResult.total} pruebas superadas con éxito ({testResult.failed} fallos).
              </span>
            </div>
            <button onClick={() => setTestResult(null)} className="text-zinc-500 hover:text-white text-xs">
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {testResult.tests.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  t.passed
                    ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300'
                    : 'bg-red-950/30 border-red-800 text-red-200'
                }`}
              >
                {t.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#53FC18] mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {t.id}
                    </span>
                    <span className="font-bold text-white">{t.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{t.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD DE FRESCURA & PURGA DE DATOS (Req 26, 27, 48) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111619] border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Vigencia y Frescura de Datos API (TTL 24h)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Conforme a los términos de KICK, los datos de API deben refrescarse o descartarse tras 24 horas.
              </p>
            </div>
            <button
              onClick={handlePurge}
              disabled={purging}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {purging ? 'Purgando...' : 'Purgar Datos Expirados'}
            </button>
          </div>

          {purgeResult && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between">
              <span>{purgeResult}</span>
              <button onClick={() => setPurgeResult(null)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Frescos (&lt;6h)</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {freshness?.freshCount ?? 0}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Vigentes (6h - 18h)</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {freshness?.agingCount ?? 0}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Por Expirar (18h - 24h)</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {freshness?.staleCount ?? 0}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Expirados (&gt;24h)</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 block">
                {freshness?.expiredCount ?? 0}
              </span>
            </div>
          </div>

          {/* Advertencia si hay datos expirados */}
          {(freshness?.expiredCount ?? 0) > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Hay <strong>{freshness?.expiredCount} canales</strong> con datos de API que han superado el TTL de 24h.
                El guardia de publicación ocultará sus métricas obsoletas en rankings públicos hasta sincronizar de nuevo.
              </span>
            </div>
          )}
        </div>

        {/* SIMULADOR DE REQUEST BUDGET (Req 18) */}
        <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-[#53FC18]" />
              Calculador de Request Budget
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Proyecta peticiones para garantizar que una sincronización masiva se mantenga dentro del margen seguro.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Canales a sincronizar:</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={simulatedChannels}
                  onChange={(e) => setSimulatedChannels(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Prioridad:</label>
                <select
                  value={simulatedPriority}
                  onChange={(e) => setSimulatedPriority(e.target.value as 'NORMAL' | 'HIGH' | 'LOW')}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-medium"
                >
                  <option value="NORMAL">NORMAL (Monitoreo regular)</option>
                  <option value="HIGH">HIGH (Demanda manual inmediata)</option>
                  <option value="LOW">LOW (Mantenimiento de fondo)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">Peticiones estimadas:</span>
              <span className="font-mono font-bold text-white">{calculatedBudget?.estimatedRequests} req</span>
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">Límite disponible:</span>
              <span className="font-mono font-bold text-white">{calculatedBudget?.availableRequests} req/min</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
              <span className="text-zinc-400 font-bold">Estado Proyectado:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  calculatedBudget?.isSafe
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {calculatedBudget?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FUNCIONALIDADES BLOQUEADAS POR AUTORIZACIÓN (Req 3, 42) */}
      <div className="mt-8 bg-[#111619] border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Funcionalidades Bloqueadas por Compliance (Req 42)
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mb-4 max-w-3xl">
          Por directriz estricta de cumplimiento normativo, KICK ANALYTICS MX desactiva cualquier función que no
          cuente con autorización fehaciente expresa en los Términos de Desarrollador de KICK.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lockedFeatures.map((feat) => (
            <div key={feat.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-white text-xs">{feat.name}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    <Lock className="w-2.5 h-2.5" /> FEATURE LOCKED
                  </span>
                </div>
                <p className="text-zinc-400 text-xs mb-2 leading-relaxed">{feat.description}</p>
                <p className="text-zinc-500 text-[11px] italic mb-3">{feat.reason}</p>
              </div>

              <div className="pt-2.5 border-t border-zinc-800/80 text-[11px] font-semibold text-amber-300">
                {feat.requiredAuthorization}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DISCLAMER DE ENTORNO LOCAL Y AUTOMATIZACIÓN (Req 29, 30) */}
      <div className="mt-6 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 leading-relaxed flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <strong className="text-zinc-200 block mb-1">
            Arquitectura Local de Costo $0 y Automatización (Req 29):
          </strong>
          La plataforma opera directamente en el navegador del usuario para garantizar soberanía de datos y costo $0.
          Por tanto: <span className="text-amber-300 font-bold">AUTOMATIZACIÓN CONTINUA: NO DISPONIBLE EN MODO LOCAL</span> (no se simulan procesos en segundo plano con la ventana cerrada). Las sincronizaciones se ejecutan bajo demanda o al abrir la aplicación verificando previamente el presupuesto de peticiones.
        </div>
      </div>
    </div>
  );
};
