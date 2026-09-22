/**
 * KICK ANALYTICS MX — PANEL DE COBERTURA Y DESCUBRIMIENTO (Fase 6, Reqs 14, 15, 16, 22, 23, 24, 25)
 * Ruta: /admin/cobertura
 * 
 * Gestiona el catálogo de cobertura, candidatos descubiertos mediante la API oficial,
 * verificación regional estricta (no inferir México) y lista controlada de monitoreo.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  PlusCircle,
  Eye,
  Trash2,
  MapPin,
  ChevronRight,
  Filter,
  Info,
  Radio,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  CoverageStats,
  DiscoveryCandidate,
  MonitoredChannel,
  RegionalVerificationStatus,
  Streamer,
  SyncPriority,
} from '../types';

export const CoveragePage: React.FC = () => {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [monitoredList, setMonitoredList] = useState<MonitoredChannel[]>([]);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoverySummary, setDiscoverySummary] = useState<string | null>(null);

  // Filtros
  const [activeTab, setActiveTab] = useState<'candidates' | 'monitored' | 'mexico'>('candidates');
  const [candidateFilter, setCandidateFilter] = useState<'ALL' | 'NEW' | 'PENDING' | 'VERIFIED_MX'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Input de descubrimiento individual
  const [singleUsernameInput, setSingleUsernameInput] = useState('');
  const [singleDiscovering, setSingleDiscovering] = useState(false);

  // Modal de verificación regional
  const [selectedCandidateForVerify, setSelectedCandidateForVerify] = useState<DiscoveryCandidate | null>(null);
  const [verifySource, setVerifySource] = useState('Mención pública directa en stream / Bio oficial');
  const [verifyState, setVerifyState] = useState('CDMX');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyStatusChoice, setVerifyStatusChoice] = useState<RegionalVerificationStatus>('VERIFIED_MX');

  const loadData = async () => {
    setLoading(true);
    try {
      const st = await dataService.getStreamers();
      const cand = await dataService.getChannelRegistry().getCandidates();
      const mon = await dataService.getCoverageManager().getMonitoredList();
      const covStats = await dataService.getCoverageStats();

      setStreamers(st);
      setCandidates(cand);
      setMonitoredList(mon);
      setStats(covStats);
    } catch (err) {
      console.error('Error cargando datos de cobertura:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataService.subscribe(loadData);
    return () => unsub();
  }, []);

  // Ejecutar descubrimiento masivo mediante /livestreams oficial
  const handleRunDiscovery = async () => {
    setDiscovering(true);
    setDiscoverySummary(null);
    try {
      const discoveryEngine = dataService.getKickDiscoveryEngine();
      const registry = dataService.getChannelRegistry();
      const result = await discoveryEngine.discoverFromLivestreams(streamers, 50);

      // Persistir candidatos encontrados
      for (const cand of result.candidates) {
        await registry.addOrUpdateCandidate(cand);
      }

      setDiscoverySummary(
        `NUEVOS DESCUBRIMIENTOS: ${result.totalFound} canales consultados en vivo. ${result.newCandidatesCount} nuevos candidatos, ${result.alreadyKnownCount} ya conocidos, ${result.requiresRegionalReviewCount} requieren revisión regional.`
      );
      await loadData();
    } catch (err: unknown) {
      alert(`Error durante descubrimiento oficial: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDiscovering(false);
    }
  };

  // Descubrimiento individual por slug
  const handleDiscoverSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUsernameInput.trim()) return;

    setSingleDiscovering(true);
    try {
      const discoveryEngine = dataService.getKickDiscoveryEngine();
      const registry = dataService.getChannelRegistry();
      const candidate = await discoveryEngine.discoverSingleChannel(singleUsernameInput.trim(), streamers);

      if (!candidate) {
        alert(`El canal @${singleUsernameInput} no fue encontrado o no está disponible públicamente en KICK.`);
      } else {
        await registry.addOrUpdateCandidate(candidate);
        setSingleUsernameInput('');
        await loadData();
        alert(`Canal @${candidate.username} evaluado exitosamente. Estado: ${candidate.status}.`);
      }
    } catch (err: unknown) {
      alert(`Error al consultar canal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSingleDiscovering(false);
    }
  };

  // Guardar verificación regional
  const handleSaveRegionalVerification = async () => {
    if (!selectedCandidateForVerify) return;
    try {
      const registry = dataService.getChannelRegistry();
      await registry.updateRegionalVerification(
        selectedCandidateForVerify.id,
        {
          status: verifyStatusChoice,
          verificationSource: verifySource,
          verificationDate: new Date().toISOString(),
          verifiedBy: 'Operador / Auditor KICK MX',
          notes: verifyNotes,
        },
        verifyStatusChoice === 'VERIFIED_MX' ? verifyState : undefined
      );

      setSelectedCandidateForVerify(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Agregar canal a la lista de monitoreo
  const handleToggleMonitoring = async (username: string, isMonitored: boolean) => {
    const covMgr = dataService.getCoverageManager();
    if (isMonitored) {
      await covMgr.pauseMonitoring(username);
    } else {
      const streamer = streamers.find((s) => s.username.toLowerCase() === username.toLowerCase());
      if (streamer) {
        await covMgr.addToMonitoring(streamer, 'NORMAL');
      } else {
        // Monitorear desde candidato
        const cand = candidates.find((c) => c.username.toLowerCase() === username.toLowerCase());
        if (cand) {
          await covMgr.addToMonitoring(
            {
              id: cand.channelId || cand.id,
              username: cand.username,
              displayName: cand.displayName,
              publicName: null,
              avatarUrl: cand.avatarUrl || '/placeholder-avatar.png',
              bio: cand.bio || null,
              kickUrl: `https://kick.com/${cand.username}`,
              status: 'active',
              country: cand.countryStatus === 'VERIFIED_MX' ? 'México' : 'NO DISPONIBLE',
              city: null,
              state: null,
              organization: null,
              socialLinks: [],
              primaryCategory: cand.category || 'General',
              categories: [cand.category || 'General'],
              followers: { value: cand.followersCount || null, period: 'Actual', source: cand.source },
              avgViewers: { value: null, period: 'Actual', source: cand.source },
              peakViewers: { value: null, period: 'Actual', source: cand.source },
              hoursStreamed: { value: null, period: 'Actual', source: cand.source },
              lastStreamDate: null,
              isDemo: false,
              createdAt: cand.discoveredAt,
              updatedAt: cand.lastSeen,
              verificationDate: cand.discoveredAt,
              source: cand.source,
            },
            'NORMAL'
          );
        }
      }
    }
    await loadData();
  };

  // Descartar candidato
  const handleRemoveCandidate = async (candidateId: string) => {
    if (!confirm('¿Desea descartar este candidato de la lista de descubrimiento?')) return;
    await dataService.getChannelRegistry().removeCandidate(candidateId);
    await loadData();
  };

  // Filtrado de candidatos
  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    if (candidateFilter === 'NEW') list = list.filter((c) => c.status === 'NEW');
    if (candidateFilter === 'PENDING') list = list.filter((c) => c.verificationStatus === 'PENDING');
    if (candidateFilter === 'VERIFIED_MX') list = list.filter((c) => c.countryStatus === 'VERIFIED_MX');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
      list = list.filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          c.displayName.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, candidateFilter, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 pb-24 animate-in fade-in duration-150">
      {/* Encabezado y Navegación */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 mb-2">
            <Compass className="w-3.5 h-3.5" />
            Fase 6 — Descubrimiento & Cobertura Oficial
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Cobertura & Monitoreo del Ecosistema
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Catálogo estructurado de canales descubiertos vía API oficial. Verificación de identidad canónica,
            supervisión regional y conjunto controlado de canales monitorizados.
          </p>
        </div>

        {/* Botón de Descubrimiento Oficial */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDiscovery}
            disabled={discovering}
            className="flex items-center gap-2 bg-[#53FC18] hover:bg-[#46d615] text-black font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-[#53FC18]/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
            {discovering ? 'EXPLORANDO API OFICIAL...' : 'EJECUTAR DESCUBRIMIENTO API'}
          </button>
        </div>
      </div>

      {/* Banner de Descubrimiento (si se acaba de ejecutar) */}
      {discoverySummary && (
        <div className="mt-4 p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 text-blue-200 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{discoverySummary}</p>
          </div>
          <button onClick={() => setDiscoverySummary(null)} className="text-blue-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Disclaimer Normativo de Cobertura (Req 25) */}
      <div className="mt-4 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-zinc-200">Aviso Metodológico de Cobertura:</strong> La cobertura representa los canales descubiertos y/o monitorizados por las fuentes oficiales disponibles de KICK ANALYTICS MX y <strong>no garantiza que incluya todos los canales existentes en la plataforma KICK</strong>. La inclusión en monitoreo es selectiva y voluntaria para proteger cuotas de API y almacenamiento.
        </p>
      </div>

      {/* Tarjetas de Métricas de Cobertura (Req 23 & 24) */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111619] border border-zinc-800/80 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Canales Conocidos</span>
          <span className="text-xl sm:text-2xl font-black text-white font-mono mt-1 block">
            {stats?.totalKnown ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">En base activa</span>
        </div>

        <div className="bg-[#111619] border border-zinc-800/80 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Descubiertos</span>
          <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono mt-1 block">
            {stats?.totalDiscovered ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">Candidatos totales</span>
        </div>

        <div className="bg-[#111619] border border-zinc-800/80 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Monitorizados</span>
          <span className="text-xl sm:text-2xl font-black text-[#53FC18] font-mono mt-1 block">
            {monitoredList.filter((m) => m.isMonitored).length}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">Conjunto activo</span>
        </div>

        <div className="bg-[#111619] border border-emerald-950/60 rounded-xl p-3.5 bg-gradient-to-b from-emerald-950/20 to-transparent">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">🇲🇽 Verificados MX</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-1 block">
            {stats?.mexicoVerified ?? 0}
          </span>
          <span className="text-[10px] text-emerald-500 mt-1 block">Con fuente fehaciente</span>
        </div>

        <div className="bg-[#111619] border border-amber-950/60 rounded-xl p-3.5 bg-gradient-to-b from-amber-950/20 to-transparent">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">⏳ Pendiente Región</span>
          <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1 block">
            {stats?.mexicoPending ?? 0}
          </span>
          <span className="text-[10px] text-amber-500 mt-1 block">Revisión requerida</span>
        </div>

        <div className="bg-[#111619] border border-zinc-800/80 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">País Desconocido</span>
          <span className="text-xl sm:text-2xl font-black text-zinc-400 font-mono mt-1 block">
            {stats?.mexicoUnknown ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">Sin procedencia</span>
        </div>
      </div>

      {/* Barra de pestañas y herramientas */}
      <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'bg-[#53FC18] text-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Candidatos Descubiertos ({candidates.length})
          </button>

          <button
            onClick={() => setActiveTab('monitored')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'monitored'
                ? 'bg-[#53FC18] text-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Lista de Monitoreo ({monitoredList.filter((m) => m.isMonitored).length})
          </button>
        </div>

        {/* Búsqueda y descubrimiento individual */}
        <form onSubmit={handleDiscoverSingle} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Evaluar canal: @usuario..."
              value={singleUsernameInput}
              onChange={(e) => setSingleUsernameInput(e.target.value)}
              className="bg-[#111619] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18] w-48 sm:w-60"
            />
          </div>
          <button
            type="submit"
            disabled={singleDiscovering || !singleUsernameInput.trim()}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs disabled:opacity-40 transition"
          >
            {singleDiscovering ? 'Consultando...' : 'Evaluar'}
          </button>
        </form>
      </div>

      {/* CONTENIDO PESTAÑA: CANDIDATOS */}
      {activeTab === 'candidates' && (
        <div className="mt-4">
          {/* Subfiltros de candidatos */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtrar:
              </span>
              {(['ALL', 'NEW', 'PENDING', 'VERIFIED_MX'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCandidateFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    candidateFilter === f
                      ? 'bg-zinc-800 text-[#53FC18] border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {f === 'ALL' && 'Todos'}
                  {f === 'NEW' && 'Nuevos'}
                  {f === 'PENDING' && 'Pendientes'}
                  {f === 'VERIFIED_MX' && '🇲🇽 Verificados MX'}
                </button>
              ))}
            </div>

            <div className="text-xs text-zinc-500">
              Mostrando {filteredCandidates.length} candidatos
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center bg-[#111619] border border-zinc-800 rounded-2xl">
              <Compass className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm font-semibold">No se encontraron candidatos con el filtro actual.</p>
              <p className="text-zinc-400 text-xs mt-1">Presiona &quot;EJECUTAR DESCUBRIMIENTO API&quot; para buscar canales activos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#111619] border border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider bg-zinc-900/40">
                    <th className="py-3 px-4">Canal / Streamer</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Estatus Regional</th>
                    <th className="py-3 px-3">Estatus Catálogo</th>
                    <th className="py-3 px-3">Descubierto</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredCandidates.map((cand) => {
                    const isMonitored = monitoredList.some(
                      (m) => m.username.toLowerCase() === cand.username.toLowerCase() && m.isMonitored
                    );

                    return (
                      <tr key={cand.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={cand.avatarUrl || '/placeholder-avatar.png'}
                              alt={cand.displayName}
                              className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold text-white block">{cand.displayName}</span>
                              <span className="font-mono text-[11px] text-zinc-400 block">@{cand.username}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300">
                            {cand.category || 'General'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {cand.countryStatus === 'VERIFIED_MX' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                              🇲🇽 MÉXICO VERIFICADO
                            </span>
                          ) : cand.countryStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                              ⏳ PENDIENTE VERIFICACIÓN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">
                              PAÍS: NO DISPONIBLE
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cand.status === 'NEW'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {cand.status === 'NEW' ? 'NUEVO' : 'CONOCIDO'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-zinc-400 text-[11px]">
                          {new Date(cand.discoveredAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedCandidateForVerify(cand);
                                setVerifyStatusChoice(cand.countryStatus);
                              }}
                              title="Verificar procedencia regional"
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition"
                            >
                              Verificar Región
                            </button>

                            <button
                              onClick={() => handleToggleMonitoring(cand.username, isMonitored)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                                isMonitored
                                  ? 'bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-800'
                                  : 'bg-[#53FC18]/10 text-[#53FC18] hover:bg-[#53FC18]/20 border border-[#53FC18]/30'
                              }`}
                            >
                              {isMonitored ? 'Pausar Monitoreo' : 'Monitorear'}
                            </button>

                            <button
                              onClick={() => handleRemoveCandidate(cand.id)}
                              title="Descartar candidato"
                              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA: LISTA DE MONITOREO */}
      {activeTab === 'monitored' && (
        <div className="mt-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-white block">Gestión de Presupuesto de Monitoreo</span>
              <span className="text-zinc-400 text-[11px]">
                Límite seguro: 60 peticiones/min. Sincronización inteligente basada en TTL y cambios de estado.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 font-mono font-bold text-[11px] border border-emerald-800">
                PRESUPUESTO: SEGURO
              </span>
            </div>
          </div>

          {monitoredList.length === 0 ? (
            <div className="p-8 text-center bg-[#111619] border border-zinc-800 rounded-2xl">
              <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm font-semibold">No hay canales en la lista de monitoreo activo.</p>
              <p className="text-zinc-400 text-xs mt-1">Selecciona &quot;Monitorear&quot; en la pestaña de candidatos o en los perfiles de streamer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#111619] border border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider bg-zinc-900/40">
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-3">Prioridad</th>
                    <th className="py-3 px-3">Estado Monitoreo</th>
                    <th className="py-3 px-3">Última Consulta</th>
                    <th className="py-3 px-3">Fuente</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {monitoredList.map((m) => (
                    <tr key={m.username} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{m.displayName}</span>
                        <span className="font-mono text-[11px] text-zinc-400 block">@{m.username}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                          {m.priority}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {m.isMonitored ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/30">
                            ● ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                            PAUSADO
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-zinc-400 text-[11px]">
                        {m.lastPolledAt ? new Date(m.lastPolledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Pendiente'}
                      </td>

                      <td className="py-3 px-3 text-zinc-400 text-[11px] font-mono truncate max-w-[150px]">
                        {m.source}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleMonitoring(m.username, m.isMonitored)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition"
                          >
                            {m.isMonitored ? 'Pausar' : 'Reanudar'}
                          </button>

                          <button
                            onClick={() => dataService.getCoverageManager().removeFromMonitoring(m.username).then(loadData)}
                            title="Quitar de monitoreo"
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE VERIFICACIÓN REGIONAL (Req 10, 11) */}
      {selectedCandidateForVerify && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#53FC18]" />
                <h3 className="font-extrabold text-white text-base">
                  Verificación Regional de Streamer
                </h3>
              </div>
              <button
                onClick={() => setSelectedCandidateForVerify(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
                <img
                  src={selectedCandidateForVerify.avatarUrl || '/placeholder-avatar.png'}
                  alt={selectedCandidateForVerify.displayName}
                  className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                />
                <div>
                  <span className="font-bold text-white text-sm block">
                    {selectedCandidateForVerify.displayName}
                  </span>
                  <span className="font-mono text-zinc-400">@{selectedCandidateForVerify.username}</span>
                </div>
              </div>

              {/* Directriz de Compliance */}
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] leading-relaxed">
                <strong>Directriz de Cumplimiento (Fase 6):</strong> NO marcar como mexicano por idioma español, apariencia o conjeturas. Se requiere constancia fehaciente (bio oficial, mención explícita o confirmación verificable).
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Clasificación Regional:</label>
                <select
                  value={verifyStatusChoice}
                  onChange={(e) => setVerifyStatusChoice(e.target.value as RegionalVerificationStatus)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-[#53FC18]"
                >
                  <option value="VERIFIED_MX">🇲🇽 MÉXICO VERIFICADO (Confirmado)</option>
                  <option value="PENDING">⏳ PENDIENTE DE VERIFICACIÓN</option>
                  <option value="UNKNOWN">PAÍS DESCONOCIDO (No disponible)</option>
                  <option value="NOT_VERIFIED">NO VERIFICADO / OTRO PAÍS</option>
                </select>
              </div>

              {verifyStatusChoice === 'VERIFIED_MX' && (
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Entidad Federativa / Estado (MX):</label>
                  <input
                    type="text"
                    value={verifyState}
                    onChange={(e) => setVerifyState(e.target.value)}
                    placeholder="Ej. CDMX, Jalisco, Nuevo León, etc."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#53FC18]"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Fuente Fehaciente de Respaldo:</label>
                <input
                  type="text"
                  value={verifySource}
                  onChange={(e) => setVerifySource(e.target.value)}
                  placeholder="Ej. Mención pública directa / Biografía oficial / Red social oficial"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#53FC18]"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Notas de Auditoría (Opcional):</label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Detalles sobre la verificación para trazabilidad técnica..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#53FC18]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setSelectedCandidateForVerify(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRegionalVerification}
                className="px-4 py-2 rounded-xl bg-[#53FC18] hover:bg-[#46d615] text-black font-bold text-xs shadow-lg"
              >
                Guardar Verificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
