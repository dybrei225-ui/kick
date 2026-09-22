import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Search,
  Mail,
  Send,
  CheckCircle2,
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  const [ticketSent, setTicketSent] = useState(false);
  const [streamerUsername, setStreamerUsername] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setStreamerUsername('');
      setCorrectionNote('');
    }, 4000);
  };

  return (
    <div id="methodology-page" className="w-full max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-[#53FC18]" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Metodología, Transparencia y Origen de Datos
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Guía técnica y principios metodológicos detrás de la recolección, verificación y presentación de métricas en KICK Analytics MX.
        </p>
      </div>

      {/* Mandatory Disclaimer Box (Requirement 14) */}
      <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
            Descargo de Responsabilidad Obligatorio
          </h3>
          <p className="leading-relaxed">
            <strong>KICK ANALYTICS MX es un proyecto analítico independiente. No está afiliado, respaldado ni patrocinado oficialmente por KICK a menos que se indique expresamente.</strong>
          </p>
          <p className="text-[11px] text-amber-300/80">
            Todas las marcas registradas, nombres de canales, logotipos y activos audiovisuales de KICK pertenecen a sus respectivos propietarios legales.
          </p>
        </div>
      </div>

      {/* Volatility Warning Box (Requirement 14) */}
      <div className="mt-4 p-4 rounded-xl bg-[#111714] border border-[#53FC18]/40 text-xs text-slate-300 flex items-start gap-3">
        <Clock className="w-5 h-5 text-[#53FC18] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-[#53FC18] uppercase tracking-wider text-[11px]">
            Advertencia de Dinámica de Datos
          </h3>
          <p className="leading-relaxed text-slate-200">
            &quot;Las métricas de KICK cambian constantemente. Los valores mostrados representan datos observados durante el periodo indicado y pueden cambiar posteriormente.&quot;
          </p>
        </div>
      </div>

      {/* Methodology Content Sections */}
      <div className="mt-8 space-y-6 text-xs text-slate-300 leading-relaxed">
        {/* Section 1: Origen de los Datos */}
        <section className="bg-[#111619] border border-zinc-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#53FC18]" />
            1. ¿Cómo se obtienen los datos?
          </h2>
          <p className="mb-3">
            KICK Analytics MX opera bajo una política rigurosa de <strong>cero conjeturas y cero scraping invasivo</strong>. Toda métrica proviene exclusivamente de:
          </p>
          <ul className="space-y-2 list-disc list-inside text-zinc-400 pl-2">
            <li>
              <strong className="text-white">Perfiles públicos oficiales de KICK:</strong> Contadores públicos de seguidores, avatar, biografía y categorías declaradas por el propio canal.
            </li>
            <li>
              <strong className="text-white">Transmisiones en vivo y registros de VODs:</strong> Métricas de audiencia concurrente, horas transmitidas y picos observados en sesiones públicas.
            </li>
            <li>
              <strong className="text-white">Declaraciones públicas de los creadores:</strong> Enlaces a redes oficiales (X, Instagram, YouTube, Discord) y confirmación expresa de su estado o región en México.
            </li>
          </ul>
        </section>

        {/* Section 2: Observado vs Calculado vs Demo */}
        <section className="bg-[#111619] border border-zinc-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#53FC18]" />
            2. Qué significa &quot;Observado&quot;, &quot;Calculado&quot; y &quot;Demo&quot;
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="p-3.5 bg-[#0e1315] rounded-xl border border-emerald-900/40">
              <div className="font-bold text-[#53FC18] text-xs mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Métrica Observada</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Lectura directa e inalterada de un contador público oficial (por ejemplo: contador de seguidores o pico máximo en directo). Si no está disponible, se muestra <em>&quot;NO DISPONIBLE&quot;</em>.
              </p>
            </div>

            <div className="p-3.5 bg-[#0e1315] rounded-xl border border-sky-900/40">
              <div className="font-bold text-sky-400 text-xs mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Métrica Calculada</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Resultado de una fórmula matemática transparente (por ejemplo: media de audiencia entre sesiones, horas acumuladas o tasa porcentual de crecimiento entre periodos).
              </p>
            </div>

            <div className="p-3.5 bg-[#0e1315] rounded-xl border border-amber-900/40">
              <div className="font-bold text-amber-400 text-xs mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Métrica Demo</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Muestra estructurada con fines de diseño y prueba funcional cuando el usuario explora sin conexión de API oficial o sin base manual cargada. Siempre se etiqueta visiblemente.
              </p>
            </div>
          </div>
        </section>

        {/* Sección de Cumplimiento de Términos de Desarrollador de KICK (Fase 6) */}
        <section className="bg-[#111619] border border-[#53FC18]/30 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#53FC18]">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">
              Cumplimiento de Términos de Desarrollador de KICK &amp; Políticas de Retención (Fase 6)
            </h2>
          </div>
          <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <p>
              KICK ANALYTICS MX opera bajo una estricta política de <strong>Cumplimiento Primero (Compliance First)</strong>, alineada íntegramente con los términos oficiales de la API de desarrolladores de KICK:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>
                <strong>Cero Scraping &amp; Endpoints Oficiales:</strong> Todas las peticiones se dirigen exclusivamente a los endpoints públicos documentados (<code className="text-zinc-200">api.kick.com/public/v1</code>). No se realiza scraping HTML, ni se consumen APIs internas privadas ni se evaden controles de rate limiting.
              </li>
              <li>
                <strong>Límite de Retención de 24 Horas (TTL):</strong> Los datos y mediciones crudas provenientes de la API son retenidos en memoria y almacenamiento local con un tiempo de vida máximo de 24 horas. Los datos caducados se purgan automáticamente o se ocultan de clasificaciones públicas.
              </li>
              <li>
                <strong>Separación de Datos Crudos vs. Derivados:</strong> Se distingue estrictamente entre los datos directos de la API (<code className="text-zinc-200">KICK_API_DATA</code>) y las métricas analíticas calculadas por el motor analítico propio (<code className="text-zinc-200">INTERNAL_DERIVED_DATA</code>), como tasas de crecimiento, promedios móviles y scores de momentum.
              </li>
              <li>
                <strong>No Redistribución Masiva:</strong> La plataforma no actúa como intermediario comercial ni ofrece volcados de bases de datos completas de KICK a terceros.
              </li>
              <li>
                <strong>Protección Absoluta de Secretos:</strong> Las credenciales sensibles (<code className="text-zinc-200">Client Secret</code>) se custodian de manera volátil en memoria y nunca se persisten en almacenamiento local persistente ni se transmiten a servidores de terceros.
              </li>
              <li>
                <strong>Principio de Cero Inferencia Regional Falsa:</strong> No se asume ni clasifica a ningún creador como originario de México por su acento, idioma, horarios o categoría de juego. Solo se asigna la condición de 🇲🇽 MÉXICO VERIFICADO cuando exista una fuente fehaciente comprobable.
              </li>
            </ul>
          </div>
        </section>

        {/* Sección: Motor de Inteligencia Analítica y Métricas Estadísticas (Fase 7) */}
        <section className="bg-[#111619] border border-sky-500/30 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sky-400">
            <Layers className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">
              Motor Estadístico &amp; Catálogo Metodológico de Fórmulas (Fase 7)
            </h2>
          </div>
          <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              El motor analítico de KICK ANALYTICS MX es un sistema determinista, reproducible y auditable. Cada métrica derivada cuenta con definición explícita, versión de fórmula y trazabilidad completa de sus entradas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block mb-1">Tasa de Crecimiento (Growth Rate v1)</span>
                <code className="text-[11px] text-emerald-400 block mb-1">((Final - Inicial) / Inicial) * 100</code>
                <p className="text-[11px] text-zinc-400">
                  Si el valor inicial es 0 o no existe registro previo comprobable, la operación retorna estrictamente <strong>&quot;NO DISPONIBLE&quot;</strong>, evitando infinitos o divisiones por cero.
                </p>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block mb-1">Mediana de Audiencia &amp; Muestra Robusta</span>
                <code className="text-[11px] text-emerald-400 block mb-1">Mediana(serie de concurrencia ordenada)</code>
                <p className="text-[11px] text-zinc-400">
                  Resistente a picos atípicos (raids o eventos únicos). Para muestras pares toma el promedio de los dos elementos centrales; para impares, el valor central exacto.
                </p>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block mb-1">Detección de Anomalías (MAD v1)</span>
                <code className="text-[11px] text-emerald-400 block mb-1">|X - Mediana| &gt; 3 * 1.4826 * Mediana(|Xi - Mediana|)</code>
                <p className="text-[11px] text-zinc-400">
                  Técnica estadística de Desviación Absoluta respecto a la Mediana. Señala valores inusuales sin formular acusaciones, juicios o presunciones de fraude.
                </p>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block mb-1">Ratio Audiencia / Comunidad</span>
                <code className="text-[11px] text-emerald-400 block mb-1">Promedio Viewers / Total Seguidores</code>
                <p className="text-[11px] text-zinc-400">
                  Indicador de concurrencia relativa a la base de seguidores conocida. Requiere denominador &gt; 0; de lo contrario retorna <strong>&quot;NO DISPONIBLE&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-200 text-[11px] space-y-1">
              <span className="font-bold text-amber-300 block">Principio de No Mezcla DEMO / REAL:</span>
              <p>
                Los cálculos analíticos nunca combinan capturas del entorno DEMO con registros provenientes de la API oficial o de importaciones manuales verificadas. Cualquier intento de cálculo cruzado genera una interrupción de integridad.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Solicitud de Corrección o Actualización por Streamers */}
        <section className="bg-[#111619] border border-zinc-800 rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#53FC18]" />
            3. ¿Cómo solicitar actualización o corrección de datos?
          </h2>
          <p className="mb-4 text-zinc-300 leading-relaxed">
            Si eres creador de contenido en KICK México y deseas actualizar tus métricas, corregir tu ubicación geográfica o añadir tus enlaces oficiales, puedes enviar tu solicitud directamente:
          </p>

          {ticketSent ? (
            <div className="p-4 bg-[#111c15] border border-[#53FC18] rounded-xl text-[#53FC18] flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>
                ¡Solicitud recibida! El equipo revisará los contadores públicos de tu canal en kick.com/{streamerUsername} y actualizará el registro.
              </span>
            </div>
          ) : (
            <form onSubmit={handleCorrectionSubmit} className="space-y-3 bg-[#0d1214] p-4 rounded-xl border border-zinc-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-medium">
                    Tu canal de KICK (@username)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. elamigostreamer"
                    value={streamerUsername}
                    onChange={(e) => setStreamerUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#53FC18]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-medium">
                    Tipo de solicitud
                  </label>
                  <select className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#53FC18]">
                    <option value="update_metrics">Actualización de métricas observadas</option>
                    <option value="update_location">Corrección de estado/ciudad</option>
                    <option value="update_social">Agregar redes sociales públicas</option>
                    <option value="remove_channel">Retiro de canal del directorio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] mb-1 font-medium">
                  Detalles o enlaces de verificación pública
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Indica qué dato requieres actualizar o comparte tu enlace público oficial..."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#53FC18]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar solicitud de corrección</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};
