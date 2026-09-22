import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Search,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ImportJob, ChangeLogEntry } from '../types';
import { dataService } from '../services/dataService';
import { formatNumber } from '../utils/formatters';

export const UpdatesHistoryPage: React.FC = () => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedJobForRollback, setSelectedJobForRollback] = useState<ImportJob | null>(null);
  const [isRollbacking, setIsRollbacking] = useState<boolean>(false);
  const [rollbackResult, setRollbackResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const j = await dataService.sync.getImportJobs();
      const logs = await dataService.sync.getChangeLogs();
      setJobs(j);
      setChangeLogs(logs);
    } catch {
      // Error loading
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteRollback = async () => {
    if (!selectedJobForRollback) return;
    setIsRollbacking(true);
    setRollbackResult(null);

    try {
      const res = await dataService.rollbackJob(selectedJobForRollback);
      setRollbackResult(res);
      await loadData();
    } catch (e: any) {
      setRollbackResult({
        success: false,
        message: `Error al ejecutar rollback: ${e?.message || 'Fallo desconocido'}`,
      });
    } finally {
      setIsRollbacking(false);
      setSelectedJobForRollback(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
            <History className="w-3.5 h-3.5" /> REQUERIMIENTOS 43, 44, 45 — HISTORIAL Y ROLLBACK
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            HISTORIAL DE IMPORTACIONES Y ROLLBACK
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Trazabilidad completa de trabajos de ingesta, auditoría de cambios en canales y reversión transaccional segura sin pérdida de snapshots históricos.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar historial
        </button>
      </div>

      {/* Mensaje de resultado de Rollback */}
      {rollbackResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            rollbackResult.success
              ? 'bg-[#12191c] border-[#53FC18]/50 text-[#53FC18]'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {rollbackResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-[#53FC18] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-bold block text-sm">
              {rollbackResult.success ? 'Rollback ejecutado con éxito' : 'Error en rollback'}
            </span>
            <p className="font-mono mt-0.5">{rollbackResult.message}</p>
          </div>
        </div>
      )}

      {/* Modal de confirmación de Rollback (Requerimiento 45) */}
      {selectedJobForRollback && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#12191c] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-white">CONFIRMAR ROLLBACK</h3>
                <span className="text-xs text-zinc-400">Trabajo: {selectedJobForRollback.id}</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#0a0e10] border border-zinc-800 rounded-xl space-y-2 text-xs">
              <p className="text-zinc-300">
                Esta operación revertirá:{' '}
                <strong className="text-amber-400 font-mono">
                  {selectedJobForRollback.updated} modificaciones
                </strong>{' '}
                y{' '}
                <strong className="text-amber-400 font-mono">
                  {selectedJobForRollback.created} nuevos registros
                </strong>.
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Los snapshots históricos capturados antes o de forma independiente no serán eliminados.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedJobForRollback(null)}
                disabled={isRollbacking}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={isRollbacking}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/20"
              >
                {isRollbacking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                CONFIRMAR ROLLBACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de trabajos de importación */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="p-8 text-center bg-[#12191c] border border-zinc-800 rounded-2xl space-y-3">
            <History className="w-10 h-10 text-zinc-600 mx-auto" />
            <span className="font-mono text-sm text-zinc-400 block">No hay trabajos de importación registrados</span>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Utiliza el importador transaccional para cargar listas de canales o snapshots históricos.
            </p>
            <a
              href="/importador"
              className="inline-block px-4 py-2 bg-[#53FC18] text-black text-xs font-bold font-mono rounded-lg"
            >
              Ir al Importador
            </a>
          </div>
        ) : (
          jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const jobLogs = changeLogs.filter((l) => l.importJobId === job.id);

            return (
              <div
                key={job.id}
                className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden transition-colors"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white">{job.source}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          job.status === 'COMPLETED'
                            ? 'bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/30'
                            : job.status === 'CANCELLED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">ID: {job.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{new Date(job.startedAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>
                        {job.records} registros ({job.created} nuevos, {job.updated} modificados)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {jobLogs.length > 0 ? `${jobLogs.length} cambios` : 'Detalles'}
                    </button>

                    {job.rollbackData && job.status === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedJobForRollback(job)}
                        className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-400 flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        DESHACER
                      </button>
                    )}
                  </div>
                </div>

                {/* Desplegable de detalles y logs de cambios */}
                {isExpanded && (
                  <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400">
                      <div>Tipo fuente: <span className="text-white">{job.sourceType}</span></div>
                      <div>Sin cambios: <span className="text-white">{job.unchanged}</span></div>
                      <div>Duplicados: <span className="text-white">{job.duplicates}</span></div>
                      <div>Errores: <span className="text-rose-400">{job.errors.length}</span></div>
                    </div>

                    {jobLogs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                        <span className="font-bold text-zinc-300 font-mono block">Registro detallado de cambios:</span>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {jobLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2 bg-[#12191c] rounded border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                            >
                              <div className="font-mono">
                                <span className="text-white font-bold">@{log.streamerUsername}</span>
                                <span className="text-zinc-500 ml-2">Campo: {log.fieldName || log.field}</span>
                              </div>
                              <div className="font-mono flex items-center gap-2">
                                <span className="text-zinc-400">
                                  {typeof log.previousValue === 'number' ? formatNumber(log.previousValue) : log.previousValue}
                                </span>
                                <span className="text-zinc-600">→</span>
                                <span className="text-[#53FC18]">
                                  {typeof log.newValue === 'number' ? formatNumber(log.newValue) : log.newValue}
                                </span>
                                <span className="text-zinc-500 text-[10px]">
                                  {log.diffAbsolute !== undefined
                                    ? `(${log.diffAbsolute > 0 ? `+${log.diffAbsolute}` : log.diffAbsolute})`
                                    : log.pctText ? `(${log.pctText})` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
