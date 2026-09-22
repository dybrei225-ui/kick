import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Download,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  FileText,
  Filter,
  CheckCircle2,
  Table,
  ExternalLink,
} from 'lucide-react';
import { Streamer, CategoryData, ReportType, GeneratedAnalyticalReport } from '../types';
import { dataService } from '../services/dataService';
import { formatNumber, formatHours, formatDate } from '../utils/formatters';

interface ReportsPageProps {
  streamers: Streamer[];
  categories: CategoryData[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ streamers, categories }) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('mexico');
  const [selectedUsername, setSelectedUsername] = useState<string>(streamers[0]?.username || 'elded');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.name || 'Gaming');
  const [report, setReport] = useState<GeneratedAnalyticalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Report type configuration
  const reportOptions: { type: ReportType; label: string; desc: string }[] = [
    { type: 'mexico', label: 'Reporte KICK México', desc: 'Visión agregada del ecosistema nacional y distribución.' },
    { type: 'streamer', label: 'Reporte de Streamer', desc: 'Análisis cuantitativo de un canal y su histórico.' },
    { type: 'category', label: 'Reporte por Categoría', desc: 'Volumen de audiencia y horas en un sector específico.' },
    { type: 'growth', label: 'Reporte de Crecimiento', desc: 'Magnitud de variaciones y canales con mayor volumen.' },
    { type: 'activity', label: 'Reporte de Actividad', desc: 'Continuidad de transmisiones y canales activos vs inactivos.' },
    { type: 'quality', label: 'Reporte de Calidad de Datos', desc: 'Auditoría de integridad, fuentes y vigencia de registros.' },
  ];

  const generateCurrentReport = async () => {
    setLoading(true);
    const generated = await dataService.generateAnalyticalReport(selectedReportType, {
      targetUsername: selectedUsername,
      targetCategory: selectedCategory,
      periodLabel: 'Agosto — Septiembre 2026',
    });
    setReport(generated);
    setLoading(false);
  };

  useEffect(() => {
    generateCurrentReport();
  }, [selectedReportType, selectedUsername, selectedCategory]);

  const showExportMessage = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleCopyText = () => {
    if (!report) return;
    const text = `=====================================================
${report.title}
KICK ANALYTICS MX — REPORTE DE INTELIGENCIA DE DATOS
=====================================================

Fecha de emisión: ${report.generatedDate}
Periodo evaluado: ${report.period}
Canales analizados: ${report.channelsAnalyzed}

1. HALLAZGOS PRINCIPALES
-----------------------------------------------------
${report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

2. METODOLOGÍA
-----------------------------------------------------
${report.methodology.map((m) => `- ${m}`).join('\n')}

3. LIMITACIONES DEL ANÁLISIS
-----------------------------------------------------
${report.limitations.map((l) => `- ${l}`).join('\n')}

4. FUENTES REGISTRADAS
-----------------------------------------------------
${report.sources.map((s) => `- ${s}`).join('\n')}

Generado por KICK Analytics MX ($0 Cost Platform)
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    showExportMessage('Texto copiado al portapapeles.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    if (!report) return;
    const guardCheck = dataService.getPublicationGuard().canExportDataset('json', false);
    if (!guardCheck.canExport) {
      showExportMessage(`EXPORTACIÓN BLOQUEADA: ${guardCheck.reason}`);
      return;
    }
    const html = dataService.engine.reportEngine.generateReportHtml(report);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kick-report-${report.reportType}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMessage('Informe HTML descargado.');
  };

  const handleExportJson = () => {
    if (!report) return;
    const guardCheck = dataService.getPublicationGuard().canExportDataset('json', false);
    if (!guardCheck.canExport) {
      showExportMessage(`EXPORTACIÓN BLOQUEADA: ${guardCheck.reason}`);
      return;
    }
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kick-report-${report.reportType}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMessage('Archivo JSON descargado.');
  };

  const handleExportStreamersCsv = async () => {
    const guardCheck = dataService.getPublicationGuard().canExportDataset('csv', false);
    if (!guardCheck.canExport) {
      showExportMessage(`EXPORTACIÓN BLOQUEADA: ${guardCheck.reason}`);
      return;
    }
    const csv = await dataService.exportStreamersCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kick-streamers-mx-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMessage('CSV de Streamers descargado.');
  };

  const handleExportSnapshotsCsv = async () => {
    const guardCheck = dataService.getPublicationGuard().canExportDataset('csv', false);
    if (!guardCheck.canExport) {
      showExportMessage(`EXPORTACIÓN BLOQUEADA: ${guardCheck.reason}`);
      return;
    }
    const csv = await dataService.exportSnapshotsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kick-snapshots-historico-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showExportMessage('CSV de Snapshots Históricos descargado.');
  };

  return (
    <div id="reports-page" className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-6 h-6 text-[#53FC18]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Módulo de Reportes Analíticos
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Informes objetivos estructurados con formato periodístico y técnico. Respaldados por marcas temporales de observación pública sin opiniones subjetivas.
          </p>
        </div>

        {/* Global CSV Exports Quick Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportStreamersCsv}
            className="px-3 py-1.5 rounded-lg bg-[#141a1d] hover:bg-[#182024] border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Exportar base completa de streamers en CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#53FC18]" />
            <span>CSV Canales</span>
          </button>

          <button
            onClick={handleExportSnapshotsCsv}
            className="px-3 py-1.5 rounded-lg bg-[#141a1d] hover:bg-[#182024] border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Exportar histórico de snapshots en CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>CSV Snapshots</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {exportNotice && (
        <div className="mt-4 p-3 rounded-xl bg-[#142319] border border-[#53FC18]/40 text-xs text-[#53FC18] flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-[#53FC18]" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Report Type Selector Grid */}
      <div className="mt-6">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
          Seleccionar Tipo de Informe:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {reportOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setSelectedReportType(opt.type)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedReportType === opt.type
                  ? 'bg-[#16221a] border-[#53FC18] text-white shadow-[0_0_10px_rgba(83,252,24,0.15)]'
                  : 'bg-[#101416] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div>
                <span className={`text-xs font-bold block ${selectedReportType === opt.type ? 'text-[#53FC18]' : 'text-zinc-200'}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-zinc-500 line-clamp-2 mt-1">
                  {opt.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Param Selectors */}
      {selectedReportType === 'streamer' && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#12171a] border border-zinc-800 flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-300">Seleccionar Canal:</span>
          <select
            value={selectedUsername}
            onChange={(e) => setSelectedUsername(e.target.value)}
            className="bg-[#182024] border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#53FC18]"
          >
            {streamers.map((s) => (
              <option key={s.id} value={s.username}>
                {s.displayName} (@{s.username})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedReportType === 'category' && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#12171a] border border-zinc-800 flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-300">Seleccionar Categoría:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#182024] border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#53FC18]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.channelCount} canales)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Report Document Container */}
      <div className="mt-6 bg-[#0f1315] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Document Action Bar (Print, Copy, Download) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-mono text-[#53FC18] uppercase tracking-wider font-bold block">
              DOCUMENTO ANALÍTICO FORMAL
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {report?.title || 'Cargando informe...'}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg bg-[#151c20] hover:bg-[#1b2328] border border-zinc-700 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#53FC18]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#151c20] hover:bg-[#1b2328] border border-zinc-700 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Abrir vista de impresión / Guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-lg bg-[#151c20] hover:bg-[#1b2328] border border-zinc-700 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>HTML</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-[#151c20] hover:bg-[#1b2328] border border-zinc-700 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {loading || !report ? (
          <div className="py-20 text-center text-zinc-500">
            <div className="animate-spin w-8 h-8 border-2 border-[#53FC18] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs">Generando informe con datos observables...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-6 text-slate-200">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#13191c] p-4 rounded-xl border border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-500 block">Fecha de emisión</span>
                <span className="font-semibold text-white">{report.generatedDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Periodo analizado</span>
                <span className="font-semibold text-white">{report.period}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Canales evaluados</span>
                <span className="font-semibold text-white">{report.channelsAnalyzed}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Clasificación</span>
                <span className="font-mono text-[#53FC18] font-bold text-[11px]">AUDITORÍA PÚBLICA</span>
              </div>
            </div>

            {/* 1. Key Findings */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#53FC18]"></span>
                1. Hallazgos Cuantitativos Principales
              </h3>
              <ul className="space-y-2 text-xs">
                {report.keyFindings.map((finding, idx) => (
                  <li key={idx} className="bg-[#13171a] p-3 rounded-lg border border-zinc-800/80 leading-relaxed text-zinc-300">
                    {finding}
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Structured Data Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                2. Tabla de Datos Observados
              </h3>
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#141b1f] border-b border-zinc-800 text-zinc-400 font-semibold">
                      {report.tableHeaders.map((header, idx) => (
                        <th key={idx} className="p-3 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {report.tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#141a1d] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 text-zinc-300 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Methodology & Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#121618] border border-zinc-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  3. Metodología Aplicada
                </h4>
                <ul className="space-y-1.5 text-[11px] text-zinc-400 list-disc pl-4 leading-relaxed">
                  {report.methodology.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#121618] border border-zinc-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  4. Limitaciones del Análisis
                </h4>
                <ul className="space-y-1.5 text-[11px] text-zinc-400 list-disc pl-4 leading-relaxed">
                  {report.limitations.map((l, idx) => (
                    <li key={idx}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 5. Sources */}
            <div className="p-4 rounded-xl bg-[#121618] border border-zinc-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                5. Fuentes de Datos Registradas
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.sources.map((src, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#182024] text-zinc-300 border border-zinc-700"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>

            {/* Transparency Disclaimer */}
            <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
              <strong>Aviso de Transparencia:</strong> KICK ANALYTICS MX es una plataforma independiente de análisis estadístico para México. Todos los números proceden de observaciones públicas registradas y derivadas matemáticamente. No se utilizan APIs de pago ni se almacenan credenciales confidenciales ($0 Cost Infrastructure).
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
