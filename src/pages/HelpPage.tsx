import React, { useState } from 'react';
import {
  HelpCircle,
  FileText,
  UploadCloud,
  Database,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { downloadCsvTemplate, CSV_FIELD_GUIDE } from '../utils/csvTemplates';

export const HelpPage: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>('ingestion');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 mb-2">
          <HelpCircle className="w-3.5 h-3.5" /> GUÍA DEL USUARIO Y ADMINISTRADOR
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
          CENTRO DE AYUDA Y METODOLOGÍA DE DATOS
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Documentación técnica sobre importación, validación, snapshots históricos, rollback transaccional y compatibilidad con dispositivos móviles Android.
        </p>
      </div>

      {/* Descargas rápidas */}
      <div className="p-4 bg-[#12191c] border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-[#53FC18] font-bold block">PLANTILLAS OFICIALES CSV</span>
          <span className="text-xs text-zinc-400">Descarga los archivos base para alimentar el importador:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => downloadCsvTemplate('streamers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#53FC18]" />
            CSV Canales
          </button>
          <button
            onClick={() => downloadCsvTemplate('snapshots')}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            CSV Snapshots
          </button>
        </div>
      </div>

      {/* Acordeón de temas */}
      <div className="space-y-3">
        {/* SECCIÓN 1: PIPELINE DE INGESTIÓN */}
        <div className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('ingestion')}
            className="w-full p-4 text-left flex items-center justify-between text-white font-mono font-bold text-sm hover:bg-zinc-900/50"
          >
            <span className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#53FC18]" />
              1. Flujo Estricto de Ingestión Transaccional
            </span>
            {openSection === 'ingestion' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openSection === 'ingestion' && (
            <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-3 text-xs text-zinc-300">
              <p>
                Toda operación masiva sigue rigurosamente el patrón transaccional:
              </p>
              <div className="p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800 font-mono text-[11px] text-[#53FC18]">
                READ → VALIDATE → PREPARE → PREVIEW → CONFIRM → COMMIT
              </div>
              <p>
                El sistema <strong className="text-white">nunca modifica datos existentes</strong> hasta que el usuario presiona explícitamente el botón <span className="font-mono text-zinc-200">[CONFIRMAR Y GUARDAR]</span> en la pantalla de previsualización. Si se detecta un error de sintaxis o formato, la importación se detiene para prevenir corrupciones.
              </p>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: CAMPOS Y ENCABEZADOS CSV */}
        <div className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('csv')}
            className="w-full p-4 text-left flex items-center justify-between text-white font-mono font-bold text-sm hover:bg-zinc-900/50"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              2. Especificación de Columnas CSV
            </span>
            {openSection === 'csv' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openSection === 'csv' && (
            <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-3 text-xs">
              <p className="text-zinc-400">
                A continuación se describe cada campo admitido por el motor de validación:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CSV_FIELD_GUIDE.map((g) => (
                  <div key={g.field} className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[#53FC18] font-bold">{g.field}</span>
                      <span className="text-[10px] text-zinc-500">
                        {g.required ? 'Obligatorio' : 'Opcional'}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">{g.description}</p>
                    <span className="text-[10px] font-mono text-zinc-500 block">Ejemplo: {g.example}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 3: SNAPSHOTS Y RESOLUCIÓN DE COLISIONES */}
        <div className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('snapshots')}
            className="w-full p-4 text-left flex items-center justify-between text-white font-mono font-bold text-sm hover:bg-zinc-900/50"
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              3. Snapshots Históricos y Colisiones de Fechas
            </span>
            {openSection === 'snapshots' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openSection === 'snapshots' && (
            <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-3 text-xs text-zinc-300">
              <p>
                Un <strong className="text-white">snapshot</strong> representa una fotografía estadística en un punto temporal específico (día/fecha).
              </p>
              <div className="space-y-2">
                <span className="font-bold text-white block">Si ya existe un snapshot en la misma fecha:</span>
                <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">[CONSERVAR EXISTENTE]:</strong> Mantiene el registro previamente guardado sin alterarlo.
                  </li>
                  <li>
                    <strong className="text-zinc-200">[REEMPLAZAR]:</strong> Sobreescribe el snapshot con los nuevos valores del lote.
                  </li>
                  <li>
                    <strong className="text-zinc-200">[FUSIONAR]:</strong> Actualiza solo las métricas válidas no nulas conservando las notas y procedencias originales.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 4: ROLLBACK Y SEGURIDAD */}
        <div className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('rollback')}
            className="w-full p-4 text-left flex items-center justify-between text-white font-mono font-bold text-sm hover:bg-zinc-900/50"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              4. Deshacer Importación (Rollback Transaccional)
            </span>
            {openSection === 'rollback' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openSection === 'rollback' && (
            <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-2 text-xs text-zinc-300">
              <p>
                En caso de importar un archivo erróneo o con métricas anómalas, puedes acceder a{' '}
                <a href="/admin/updates" className="text-[#53FC18] underline">
                  /admin/updates
                </a>{' '}
                y pulsar <span className="font-mono text-rose-400">[DESHACER]</span>.
              </p>
              <p className="text-zinc-400">
                El sistema restaurará de inmediato el estado anterior a ese lote sin borrar los snapshots históricos existentes previamente.
              </p>
            </div>
          )}
        </div>

        {/* SECCIÓN 5: OPTIMIZACIÓN MÓVIL ANDROID */}
        <div className="bg-[#12191c] border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('mobile')}
            className="w-full p-4 text-left flex items-center justify-between text-white font-mono font-bold text-sm hover:bg-zinc-900/50"
          >
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              5. Optimización para Móviles Android
            </span>
            {openSection === 'mobile' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openSection === 'mobile' && (
            <div className="p-4 bg-[#0a0e10] border-t border-zinc-800 space-y-2 text-xs text-zinc-300">
              <p>
                Toda la plataforma ha sido concebida bajo la regla fundamental de compatibilidad con pantallas táctiles:
              </p>
              <ul className="space-y-1 list-disc list-inside text-zinc-400">
                <li>Botones y zonas de toque táctil de al menos 44px de altura.</li>
                <li>Ninguna funcionalidad o dato crítico depende exclusivamente del puntero del mouse (hover).</li>
                <li>Tablas y comparativas adaptables con scroll horizontal táctil nativo.</li>
                <li>Soporte de selector de archivos nativo de Android en el importador.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
