import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Download,
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  Streamer,
  ChannelSnapshot,
  ImportJob,
  SnapshotDuplicateConflict,
  StreamerDiffItem,
  SourceType,
} from '../types';
import { IngestionPreviewResult, syncManager } from '../engine/SyncManager';
import { downloadCsvTemplate, CSV_FIELD_GUIDE } from '../utils/csvTemplates';
import { formatNumber } from '../utils/formatters';

export const ImportPage: React.FC = () => {
  const [formatMode, setFormatMode] = useState<'csv' | 'json' | 'text'>('csv');
  const [rawInput, setRawInput] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('CSV_IMPORT');
  const [sourceName, setSourceName] = useState<string>('Importación Masiva');
  const [isDemoData, setIsDemoData] = useState<boolean>(false);

  // Estados del flujo transaccional
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewResult, setPreviewResult] = useState<IngestionPreviewResult | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>>(new Map());

  // Estado de confirmación y guardado
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [completedJob, setCompletedJob] = useState<ImportJob | null>(null);
  const [completedAlertCount, setCompletedAlertCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI helpers
  const [showCsvHelp, setShowCsvHelp] = useState<boolean>(false);
  const [activeTabDiff, setActiveTabDiff] = useState<'all' | 'new' | 'updated' | 'unchanged'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reiniciar estado
  const handleReset = () => {
    setRawInput('');
    setFileName(null);
    setPreviewResult(null);
    setConflictResolutions(new Map());
    setCompletedJob(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Carga de archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);

    if (file.name.endsWith('.json')) {
      setFormatMode('json');
      setSourceType('JSON_IMPORT');
    } else {
      setFormatMode('csv');
      setSourceType('CSV_IMPORT');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawInput(content || '');
    };
    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  // Paso 2: ANALIZAR Y PREPARAR
  const handleAnalyze = async () => {
    if (!rawInput.trim()) {
      setErrorMessage('Por favor selecciona un archivo o pega los datos antes de continuar.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setCompletedJob(null);

    try {
      const existingStreamers = await dataService.getStreamers();
      const existingSnapshots = await dataService.getAllSnapshots();

      // Parsear según formato
      const parseRes = dataService.engine.parseAndValidateImport(rawInput, existingStreamers, existingSnapshots);

      if (!parseRes.valid && parseRes.errorCount > 0 && (!parseRes.parsedPayload?.streamers?.length && !parseRes.parsedPayload?.snapshots?.length)) {
        setIsAnalyzing(false);
        setErrorMessage(parseRes.errors.join(' | '));
        return;
      }

      const incomingStreamers = parseRes.parsedPayload?.streamers || [];
      const incomingSnapshots = parseRes.parsedPayload?.snapshots || [];

      // Simulación de batch progress para grandes cantidades (Requerimiento 16 & 17)
      const totalItems = incomingStreamers.length + incomingSnapshots.length;
      if (totalItems > 50) {
        setBatchProgress({ current: 0, total: totalItems });
        for (let i = 0; i <= totalItems; i += Math.ceil(totalItems / 10)) {
          setBatchProgress({ current: Math.min(i, totalItems), total: totalItems });
          await new Promise((r) => setTimeout(r, 40));
        }
      }

      const preview = await syncManager.preview(
        incomingStreamers,
        incomingSnapshots,
        existingStreamers,
        existingSnapshots,
        {
          sourceType,
          sourceName: sourceName.trim() || (formatMode === 'json' ? 'JSON_IMPORT' : 'CSV_IMPORT'),
          isDemo: isDemoData,
        }
      );

      // Inicializar resoluciones de colisiones en 'KEEP' por defecto
      const initResolutions = new Map<string, 'KEEP' | 'REPLACE' | 'MERGE'>();
      preview.snapshotConflicts.forEach((c) => {
        initResolutions.set(c.id, 'KEEP');
      });

      setConflictResolutions(initResolutions);
      setPreviewResult(preview);
    } catch (err: any) {
      setErrorMessage(`Error inesperado al procesar los datos: ${err?.message || 'Formato desconocido'}`);
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(null);
    }
  };

  // Resolución de colisiones individuales
  const handleSetConflictResolution = (conflictId: string, res: 'KEEP' | 'REPLACE' | 'MERGE') => {
    setConflictResolutions((prev) => {
      const next = new Map(prev);
      next.set(conflictId, res);
      return next;
    });
  };

  // Paso 8: CONFIRMAR Y APLICAR TRANSACCIONALMENTE
  const handleConfirmAndSave = async () => {
    if (!previewResult) return;
    if (previewResult.errors.length > 0 && previewResult.preparedStreamers.length === 0) {
      setErrorMessage('No se puede confirmar una importación con errores fatales.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const existingStreamers = await dataService.getStreamers();
      const existingSnapshots = await dataService.getAllSnapshots();

      const commitResult = await syncManager.apply(
        previewResult,
        existingStreamers,
        existingSnapshots,
        conflictResolutions
      );

      // Guardar en dataService
      await dataService.batchApplyIngestion(commitResult.finalStreamers, commitResult.finalSnapshots);

      // Evaluar alertas automáticamente (Requerimiento 38)
      const alerts = await dataService.engine.anomalyDetector.evaluatePlatformAnomalies(
        commitResult.finalStreamers,
        commitResult.finalSnapshots
      );

      setCompletedAlertCount(alerts.length);
      setCompletedJob(commitResult.job);
      setPreviewResult(null);
    } catch (e: any) {
      setErrorMessage(`Error al persistir la importación: ${e?.message || 'Fallo transaccional'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado de cambios en la vista previa
  const filteredDiffs = previewResult?.diffs.filter((d) => {
    if (activeTabDiff === 'new') return d.isNew;
    if (activeTabDiff === 'updated') return !d.isNew && !d.isUnchanged;
    if (activeTabDiff === 'unchanged') return d.isUnchanged;
    return true;
  }) || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 mb-2">
            <UploadCloud className="w-3.5 h-3.5" /> FASE 4 — INGESTIÓN TRANSACCIONAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            IMPORTADOR DE DATOS
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Pipeline seguro de validación, normalización, detección de duplicados y creación automática de snapshots. Sin servicios externos de pago.
          </p>
        </div>

        {/* Descargas de plantillas */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadCsvTemplate('streamers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#53FC18]" />
            Plantilla CSV Canales
          </button>
          <button
            onClick={() => downloadCsvTemplate('snapshots')}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Plantilla CSV Snapshots
          </button>
        </div>
      </div>

      {/* Pantalla de éxito tras importación */}
      {completedJob && (
        <div className="p-5 bg-[#12191c] border border-[#53FC18]/40 rounded-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#53FC18]/20 text-[#53FC18] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-white">IMPORTACIÓN COMPLETADA CON ÉXITO</h2>
                <p className="text-xs text-zinc-400">
                  Trabajo <span className="font-mono text-[#53FC18]">{completedJob.id}</span> finalizado el{' '}
                  {new Date(completedJob.finishedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white rounded-lg transition-colors"
            >
              Nueva importación
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
            <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
              <span className="text-[10px] text-zinc-500 block">Registros totales</span>
              <span className="text-xl font-bold font-mono text-white">{completedJob.records}</span>
            </div>
            <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
              <span className="text-[10px] text-zinc-500 block">Nuevos canales</span>
              <span className="text-xl font-bold font-mono text-[#53FC18]">+{completedJob.created}</span>
            </div>
            <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
              <span className="text-[10px] text-zinc-500 block">Actualizados</span>
              <span className="text-xl font-bold font-mono text-sky-400">{completedJob.updated}</span>
            </div>
            <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
              <span className="text-[10px] text-zinc-500 block">Sin cambios</span>
              <span className="text-xl font-bold font-mono text-zinc-400">{completedJob.unchanged}</span>
            </div>
            <div className="p-3 bg-[#0a0e10] border border-zinc-800 rounded-xl">
              <span className="text-[10px] text-zinc-500 block">Alertas detectadas</span>
              <span className="text-xl font-bold font-mono text-amber-400">{completedAlertCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
            <a
              href="/alertas"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Ver alertas ({completedAlertCount})
            </a>
            <a
              href="/streamers"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              Explorador de canales <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="/reportes"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-sky-400" />
              Generar reporte de esta importación
            </a>
          </div>
        </div>
      )}

      {/* Mensaje de error si existe */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">No se pudo procesar la importación:</span>
            <p className="font-mono">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: ENTRADA Y CONFIGURACIÓN (Si no hay previsualización activa) */}
      {!previewResult && !completedJob && (
        <div className="space-y-4">
          {/* Selector de formato y metadatos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">1. Formato de datos</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormatMode('csv')}
                  className={`flex-1 py-2 px-3 text-xs font-mono rounded-lg border transition-colors ${
                    formatMode === 'csv'
                      ? 'bg-[#53FC18]/15 text-[#53FC18] border-[#53FC18]/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  CSV Tabular
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode('json')}
                  className={`flex-1 py-2 px-3 text-xs font-mono rounded-lg border transition-colors ${
                    formatMode === 'json'
                      ? 'bg-[#53FC18]/15 text-[#53FC18] border-[#53FC18]/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">2. Tipo epistemológico</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-[#53FC18]"
              >
                <option value="CSV_IMPORT">CSV_IMPORT (Archivo local)</option>
                <option value="JSON_IMPORT">JSON_IMPORT (Estructurado)</option>
                <option value="MANUAL">MANUAL (Verificación manual)</option>
                <option value="KICK_PUBLIC">KICK_PUBLIC (Observado públicamente)</option>
                <option value="OTHER_PUBLIC">OTHER_PUBLIC (Fuente secundaria)</option>
                <option value="DEMO">DEMO (Datos de muestra)</option>
              </select>
            </div>

            <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">3. Etiqueta de la fuente</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Ej: Auditoría Septiembre 2026"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-[#53FC18]"
              />
            </div>
          </div>

          {/* Área de carga de archivos y pegado */}
          <div className="p-6 bg-[#12191c] border border-zinc-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">Seleccionar archivo o pegar</span>
                <span className="text-sm font-medium text-white">
                  {formatMode === 'csv' ? 'Archivo CSV o texto separado por comas' : 'Archivo JSON estructurado'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={formatMode === 'csv' ? '.csv,.txt' : '.json,.txt'}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-[#53FC18]" />
                  {fileName ? `Archivo: ${fileName}` : 'Seleccionar archivo local'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowCsvHelp(!showCsvHelp)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800"
                  title="Ayuda de formato"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ayuda desplegable */}
            {showCsvHelp && (
              <div className="p-4 bg-[#0d1214] border border-zinc-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono">Guía de encabezados para CSV:</span>
                  <button onClick={() => setShowCsvHelp(false)} className="text-zinc-500 hover:text-white">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {CSV_FIELD_GUIDE.map((g) => (
                    <div key={g.field} className="p-2 bg-zinc-900/60 rounded border border-zinc-800/80">
                      <span className="font-mono text-[#53FC18] font-bold block">{g.field}</span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">{g.description}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-1">Ej: {g.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea para pegar */}
            <div className="space-y-1">
              <textarea
                rows={8}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  formatMode === 'csv'
                    ? 'username,name,followers,averageViewers,peakViewers,hoursStreamed,category,source\nlonche,Lonche,125000,3400,22100,142,Gaming,CSV_IMPORT'
                    : '[\n  {\n    "username": "lonche",\n    "displayName": "Lonche",\n    "followers": 125000,\n    "avgViewers": 3400\n  }\n]'
                }
                className="w-full bg-[#0a0d0f] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-[#53FC18] resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>{rawInput ? `${rawInput.split('\n').length} líneas escritas` : 'Área de pegado vacía'}</span>
                {rawInput && (
                  <button onClick={() => setRawInput('')} className="text-zinc-400 hover:text-rose-400">
                    Limpiar texto
                  </button>
                )}
              </div>
            </div>

            {/* Checkbox de datos de demostración */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDemoCheckbox"
                checked={isDemoData}
                onChange={(e) => setIsDemoData(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-800 text-[#53FC18] focus:ring-0"
              />
              <label htmlFor="isDemoCheckbox" className="text-xs text-zinc-400 cursor-pointer">
                Marcar estos datos explícitamente como <span className="font-mono text-amber-300 font-bold">DEMOSTRACIÓN</span> (no alterará métricas observadas oficiales)
              </label>
            </div>

            {/* Barra de progreso de lotes (Requerimiento 17) */}
            {batchProgress && (
              <div className="space-y-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span>Procesando por lotes...</span>
                  <span className="text-[#53FC18]">
                    {batchProgress.current} / {batchProgress.total} registros
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#53FC18] h-full transition-all duration-150"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Botón de acción principal: ANALIZAR DATOS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !rawInput.trim()}
                className="px-6 py-3 bg-[#53FC18] hover:bg-[#46db13] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-[#53FC18]/10 flex items-center gap-2 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    ANALIZANDO ESTRUCTURA...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    ANALIZAR DATOS (SIN GUARDAR)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: PREVISUALIZACIÓN DE IMPORTACIÓN ANALIZADA (Requerimiento 7, 8, 11, 12) */}
      {previewResult && (
        <div className="space-y-6">
          {/* Tarjeta resumen de análisis */}
          <div className="p-5 bg-[#12191c] border border-zinc-700 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-mono text-[#53FC18] uppercase tracking-wider block">Paso 7 de 11</span>
                <h2 className="text-xl font-bold font-mono text-white">IMPORTACIÓN ANALIZADA</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewResult(null)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition-colors"
                >
                  Volver a editar
                </button>
                <button
                  onClick={handleConfirmAndSave}
                  disabled={isSaving || (previewResult.errors.length > 0 && previewResult.preparedStreamers.length === 0)}
                  className="px-5 py-2 bg-[#53FC18] hover:bg-[#46db13] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold font-mono text-xs rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  CONFIRMAR Y GUARDAR ({previewResult.preparedStreamers.length})
                </button>
              </div>
            </div>

            {/* Métricas clave del análisis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Registros</span>
                <span className="text-lg font-bold font-mono text-white">{previewResult.totalRecords}</span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Nuevos</span>
                <span className="text-lg font-bold font-mono text-[#53FC18]">+{previewResult.newCount}</span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Actualizaciones</span>
                <span className="text-lg font-bold font-mono text-sky-400">{previewResult.updatedCount}</span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Sin cambios</span>
                <span className="text-lg font-bold font-mono text-zinc-400">{previewResult.unchangedCount}</span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Duplicados</span>
                <span className={`text-lg font-bold font-mono ${previewResult.duplicateCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {previewResult.duplicateCount}
                </span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Errores</span>
                <span className={`text-lg font-bold font-mono ${previewResult.errorCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {previewResult.errorCount}
                </span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">Datos DEMO</span>
                <span className="text-lg font-bold font-mono text-amber-300">
                  {previewResult.isDemoData ? previewResult.preparedStreamers.length : 0}
                </span>
              </div>
              <div className="p-2.5 bg-[#0a0e10] border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] text-zinc-500 block">MANUAL / OBS</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {!previewResult.isDemoData ? previewResult.preparedStreamers.length : 0}
                </span>
              </div>
            </div>

            {/* Advertencias de errores si existen */}
            {previewResult.errors.length > 0 && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs space-y-1">
                <span className="font-bold text-rose-300 block">Registros con errores estructurales (serán excluidos):</span>
                <ul className="list-disc list-inside space-y-0.5 text-rose-200/80 font-mono">
                  {previewResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {previewResult.errors.length > 5 && <li>...y {previewResult.errors.length - 5} más</li>}
                </ul>
              </div>
            )}
          </div>

          {/* COLISIONES DE SNAPSHOTS EXISTENTES (Requerimiento 11 y 12) */}
          {previewResult.snapshotConflicts.length > 0 && (
            <div className="p-5 bg-amber-950/20 border border-amber-500/40 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">
                    SNAPSHOTS EXISTENTES DETECTADOS ({previewResult.snapshotConflicts.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Ya existen snapshots para estos canales en la misma fecha. La acción debe ser explícita para evitar sobreescrituras accidentales.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {previewResult.snapshotConflicts.map((c) => {
                  const currentRes = conflictResolutions.get(c.id) || 'KEEP';
                  return (
                    <div key={c.id} className="p-3.5 bg-[#0a0e10] border border-zinc-800 rounded-xl space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs">
                          <span className="font-bold font-mono text-white text-sm">@{c.username}</span>
                          <span className="text-zinc-400 ml-2 font-mono">Fecha: {c.date}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          Fuente existente: <span className="text-zinc-300">{c.existingSource}</span> → Nueva: <span className="text-[#53FC18]">{c.newSource}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSetConflictResolution(c.id, 'KEEP')}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                            currentRes === 'KEEP'
                              ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          [ CONSERVAR EXISTENTE ]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetConflictResolution(c.id, 'REPLACE')}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                            currentRes === 'REPLACE'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          [ REEMPLAZAR ]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetConflictResolution(c.id, 'MERGE')}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                            currentRes === 'MERGE'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          [ FUSIONAR CAMPOS ]
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETECCIÓN DE CAMBIOS POR STREAMER (Requerimiento 8 y 9) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#53FC18]" />
                COMPARATIVA Y REGISTRO DE CAMBIOS DETECTADOS
              </h3>
              <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                <button
                  onClick={() => setActiveTabDiff('all')}
                  className={`px-2.5 py-1 rounded ${activeTabDiff === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                >
                  Todos ({previewResult.diffs.length})
                </button>
                <button
                  onClick={() => setActiveTabDiff('updated')}
                  className={`px-2.5 py-1 rounded ${activeTabDiff === 'updated' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400'}`}
                >
                  Modificados ({previewResult.updatedCount})
                </button>
                <button
                  onClick={() => setActiveTabDiff('new')}
                  className={`px-2.5 py-1 rounded ${activeTabDiff === 'new' ? 'bg-zinc-800 text-[#53FC18]' : 'text-zinc-400'}`}
                >
                  Nuevos ({previewResult.newCount})
                </button>
                <button
                  onClick={() => setActiveTabDiff('unchanged')}
                  className={`px-2.5 py-1 rounded ${activeTabDiff === 'unchanged' ? 'bg-zinc-800 text-zinc-400' : 'text-zinc-500'}`}
                >
                  Sin cambios ({previewResult.unchangedCount})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredDiffs.map((diff) => (
                <div key={diff.username} className="p-3.5 bg-[#12191c] border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold font-mono text-white text-sm">@{diff.username}</span>
                      <span className="text-zinc-400 text-xs ml-2">{diff.displayName}</span>
                    </div>
                    <div>
                      {diff.isNew ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#53FC18]/15 text-[#53FC18] border border-[#53FC18]/30">
                          NUEVO
                        </span>
                      ) : diff.isUnchanged ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                          SIN CAMBIOS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          {diff.changes.length} CAMBIO{diff.changes.length > 1 ? 'S' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {diff.changes.map((c, i) => (
                    <div key={i} className="p-2 bg-[#0a0e10] border border-zinc-800/80 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span className="font-medium">{c.label}:</span>
                        <span
                          className={`font-mono font-bold ${
                            c.trend === 'up'
                              ? 'text-[#53FC18]'
                              : c.trend === 'down'
                              ? 'text-rose-400'
                              : 'text-zinc-300'
                          }`}
                        >
                          {c.diffText} {c.pctText ? `(${c.pctText})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                        <span>Anterior: {typeof c.previous === 'number' ? formatNumber(c.previous) : c.previous}</span>
                        <span>Nuevo: {typeof c.next === 'number' ? formatNumber(c.next) : c.next}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
