import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Save,
  X,
  Database,
  Clock,
  Layers,
  ArrowRight,
  GitMerge,
  FileCode,
} from 'lucide-react';
import { Streamer, ChannelSnapshot, QualityAuditReport, ImportValidationResult, DuplicateCandidate } from '../types';
import { dataService } from '../services/dataService';
import { formatNumber, formatDate, getStatusInfo } from '../utils/formatters';
import { PageRoute } from '../components/Navigation';

interface AdminPageProps {
  streamers: Streamer[];
  onRefresh: () => void;
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
  subView?: 'crud' | 'import' | 'audit' | 'backup';
}

export const AdminPage: React.FC<AdminPageProps> = ({
  streamers,
  onRefresh,
  onNavigate,
  subView = 'crud',
}) => {
  const [view, setView] = useState<'crud' | 'import' | 'audit' | 'backup'>(subView);
  const [editingStreamer, setEditingStreamer] = useState<Streamer | null>(null);
  const [isNewStreamer, setIsNewStreamer] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quality Audit State (Requirement 17)
  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Streamer>>({
    username: '',
    displayName: '',
    publicName: '',
    bio: '',
    avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    country: 'México',
    state: '',
    city: '',
    organization: '',
    primaryCategory: 'Gaming',
    categories: ['Gaming'],
    status: 'active',
    followers: { value: 0, lastUpdated: '2026-09-20', source: 'KICK Oficial Público', period: 'Tiempo Real', type: 'observed' },
    avgViewers: { value: 0, lastUpdated: '2026-09-20', source: 'VODs / Emisiones Públicas', period: 'Últimos 30 días', type: 'observed' },
    peakViewers: { value: 0, lastUpdated: '2026-09-20', source: 'VODs / Emisiones Públicas', period: 'Últimos 30 días', type: 'observed' },
    hoursStreamed: { value: 0, lastUpdated: '2026-09-20', source: 'VODs / Emisiones Públicas', period: 'Últimos 30 días', type: 'observed' },
    lastStreamDate: '2026-09-20',
    verificationDate: '2026-09-20',
  });

  // Import State (Requirement 9, 27)
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [rawImportInput, setRawImportInput] = useState('');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [activeDuplicateCandidate, setActiveDuplicateCandidate] = useState<DuplicateCandidate | null>(null);

  // Backup State (Requirement 28)
  const [backupRestoreInput, setBackupRestoreInput] = useState('');
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);

  // Phase 7 Test Suite State
  const [testResults, setTestResults] = useState<ReturnType<typeof dataService.runPhase7Verification> | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleRunPhase7Tests = () => {
    const res = dataService.runPhase7Verification();
    setTestResults(res);
    setShowTestModal(true);
  };

  useEffect(() => {
    if (view === 'audit') {
      runAudit();
    }
  }, [view]);

  const runAudit = async () => {
    setAuditLoading(true);
    const report = await dataService.runQualityAudit();
    setAuditReport(report);
    setAuditLoading(false);
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setIsNewStreamer(true);
    setEditingStreamer(null);
    setFormData({
      id: `streamer-${Date.now()}`,
      username: '',
      displayName: '',
      publicName: '',
      bio: '',
      avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      country: 'México',
      state: '',
      city: '',
      organization: '',
      primaryCategory: 'Gaming',
      categories: ['Gaming'],
      status: 'active',
      kickUrl: 'https://kick.com/',
      socialLinks: [],
      followers: { value: 1000, lastUpdated: '2026-09-20', source: 'KICK Oficial Público', period: 'Tiempo Real', type: 'observed' },
      avgViewers: { value: 50, lastUpdated: '2026-09-20', source: 'VODs Públicos', period: 'Últimos 30 días', type: 'observed' },
      peakViewers: { value: 150, lastUpdated: '2026-09-20', source: 'VODs Públicos', period: 'Últimos 30 días', type: 'observed' },
      hoursStreamed: { value: 20, lastUpdated: '2026-09-20', source: 'VODs Públicos', period: 'Últimos 30 días', type: 'observed' },
      lastStreamDate: '2026-09-20',
      verificationDate: '2026-09-20',
    });
  };

  const handleOpenEdit = (s: Streamer) => {
    setIsNewStreamer(false);
    setEditingStreamer(s);
    setFormData(JSON.parse(JSON.stringify(s)));
    setView('crud');
  };

  const handleSaveStreamer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.displayName) {
      showNotify('error', 'Usuario y Nombre son campos obligatorios.');
      return;
    }

    const streamerPayload: Streamer = {
      id: formData.id || `streamer-${Date.now()}`,
      username: formData.username.trim().toLowerCase().replace(/^@/, ''),
      displayName: formData.displayName.trim(),
      publicName: formData.publicName?.trim() || null,
      bio: formData.bio?.trim() || null,
      avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      country: formData.country || 'México',
      state: formData.state?.trim() || null,
      city: formData.city?.trim() || null,
      organization: formData.organization?.trim() || null,
      primaryCategory: formData.primaryCategory || 'Gaming',
      categories: formData.categories && formData.categories.length > 0 ? formData.categories : [formData.primaryCategory || 'Gaming'],
      status: formData.status || 'active',
      kickUrl: `https://kick.com/${formData.username.trim().toLowerCase().replace(/^@/, '')}`,
      socialLinks: formData.socialLinks || [],
      followers: {
        value: Number(formData.followers?.value) || 0,
        capturedAt: '2026-09-20',
        source: formData.followers?.source || 'KICK Oficial Público',
        period: 'Tiempo Real',
        type: 'observed',
      },
      avgViewers: {
        value: Number(formData.avgViewers?.value) || 0,
        capturedAt: '2026-09-20',
        source: formData.avgViewers?.source || 'VODs / Emisiones Públicas',
        period: 'Últimos 30 días',
        type: 'observed',
      },
      peakViewers: {
        value: Number(formData.peakViewers?.value) || 0,
        capturedAt: '2026-09-20',
        source: formData.peakViewers?.source || 'VODs / Emisiones Públicas',
        period: 'Últimos 30 días',
        type: 'observed',
      },
      hoursStreamed: {
        value: Number(formData.hoursStreamed?.value) || 0,
        capturedAt: '2026-09-20',
        source: formData.hoursStreamed?.source || 'VODs / Emisiones Públicas',
        period: 'Últimos 30 días',
        type: 'observed',
      },
      lastStreamDate: formData.lastStreamDate || '2026-09-20',
      verificationDate: formData.verificationDate || '2026-09-20',
      source: 'KICK Oficial Público',
      isDemo: false,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await dataService.saveStreamer(streamerPayload);
      showNotify('success', `Canal @${streamerPayload.username} guardado correctamente.`);
      setEditingStreamer(null);
      setIsNewStreamer(false);
      onRefresh();
    } catch (err: any) {
      showNotify('error', 'No se pudo guardar el canal en el proveedor activo.');
    }
  };

  const handleDeleteStreamer = async (id: string, username: string) => {
    if (window.confirm(`¿Confirmas eliminar al canal @${username}? Esta acción no se puede deshacer.`)) {
      const ok = await dataService.deleteStreamer(id);
      if (ok) {
        showNotify('success', `Canal @${username} eliminado.`);
        onRefresh();
      } else {
        showNotify('error', 'No se pudo eliminar el canal en el proveedor activo.');
      }
    }
  };

  // Step 1: Validate import
  const handleValidateImport = async () => {
    if (!rawImportInput.trim()) {
      showNotify('error', 'Por favor ingresa datos en JSON o CSV.');
      return;
    }
    const result = await dataService.validateImportPayload(rawImportInput);
    setValidationResult(result);
    if (result.duplicatesDetected && result.duplicatesDetected.length > 0) {
      setActiveDuplicateCandidate(result.duplicatesDetected[0]);
    }
  };

  // Step 2: Apply validated import
  const handleApplyValidatedImport = async () => {
    if (!validationResult || !validationResult.valid) return;
    setIsApplyingImport(true);
    const res = await dataService.applyValidatedImport(validationResult);
    setIsApplyingImport(false);

    if (res.errors.length === 0) {
      showNotify('success', `Se importaron ${res.count} canales correctamente.`);
      setValidationResult(null);
      setRawImportInput('');
      onRefresh();
    } else {
      showNotify('error', `Errores durante la importación: ${res.errors.join(', ')}`);
    }
  };

  // Backup Export
  const handleExportFullBackup = async () => {
    const json = await dataService.generateFullBackup();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kick-analytics-mx-full-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotify('success', 'Copia de seguridad completa descargada.');
  };

  // Backup Restore
  const handleRestoreBackup = async () => {
    try {
      const parsed = JSON.parse(backupRestoreInput);
      const res = await dataService.importManualData(parsed);
      if (res.success) {
        showNotify('success', `Copia restaurada: ${res.count} canales recuperados.`);
        setShowRestoreConfirmModal(false);
        setBackupRestoreInput('');
        onRefresh();
      } else {
        showNotify('error', `Error al restaurar: ${res.errors.join(', ')}`);
      }
    } catch (e: any) {
      showNotify('error', 'Formato JSON inválido para restaurar backup.');
    }
  };

  const handleResolveDuplicateMerge = (confirmMerge: boolean) => {
    if (!validationResult) return;
    if (confirmMerge) {
      showNotify('success', `Fusión aceptada para @${activeDuplicateCandidate?.streamerUsername}. Se actualizará la información existente.`);
    } else {
      showNotify('error', `Fusión cancelada para @${activeDuplicateCandidate?.streamerUsername}.`);
    }
    setActiveDuplicateCandidate(null);
  };

  const filteredStreamers = streamers.filter(
    (s) =>
      s.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.displayName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div id="admin-page" className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-6 h-6 text-[#53FC18]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Panel de Administración y Datos
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Control de canales observados, auditoría de calidad de datos, importaciones masivas y respaldos locales ($0 costo).
          </p>
        </div>

        {/* View Switcher Tabs (Requirement 17, 27, 28) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setView('crud');
              setEditingStreamer(null);
              setIsNewStreamer(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              view === 'crud'
                ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Directorio (CRUD)
          </button>

          <button
            onClick={() => setView('import')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              view === 'import'
                ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Importar (JSON/CSV)
          </button>

          <button
            onClick={() => setView('audit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              view === 'audit'
                ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Calidad (/admin/quality)
          </button>

          <button
            onClick={() => setView('backup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              view === 'backup'
                ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                : 'bg-[#141a1d] text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Backup y Restaurar
          </button>

          <button
            onClick={() => onNavigate('importador')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#53FC18]/15 text-[#53FC18] hover:bg-[#53FC18]/25 border border-[#53FC18]/30 transition-colors cursor-pointer"
          >
            + Importador Fase 4
          </button>

          <button
            onClick={() => onNavigate('admin_updates')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 transition-colors cursor-pointer"
          >
            Historial / Rollback
          </button>

          <button
            onClick={() => onNavigate('admin_cobertura')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#53FC18]/10 text-[#53FC18] hover:bg-[#53FC18]/20 border border-[#53FC18]/30 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#53FC18]" />
            Cobertura & Monitoreo
          </button>

          <button
            onClick={() => onNavigate('admin_compliance')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Compliance Gate
          </button>

          <button
            onClick={() => onNavigate('admin_connectors')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#53FC18]" />
            Conectores API Oficial
          </button>

          <button
            onClick={() => onNavigate('admin_storage')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border border-sky-500/30 transition-colors cursor-pointer"
          >
            Almacén & IndexedDB
          </button>

          <button
            onClick={() => onNavigate('admin_audit')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            Bitácora de Auditoría
          </button>

          <button
            onClick={handleRunPhase7Tests}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#53FC18]/15 text-[#53FC18] hover:bg-[#53FC18]/25 border border-[#53FC18]/40 transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(83,252,24,0.15)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#53FC18]" />
            <span>Verificación Fase 7</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
            notification.type === 'success'
              ? 'bg-[#121f15] border-[#53FC18]/40 text-[#53FC18]'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#53FC18] flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Duplicate Collision Resolution Modal (Requirement 9) */}
      {activeDuplicateCandidate && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12171a] border border-amber-500/50 max-w-md w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <GitMerge className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">POSIBLE DUPLICADO DETECTADO</h3>
            </div>
            <div className="p-3 bg-[#182024] rounded-xl border border-zinc-800 text-xs space-y-2 mb-4">
              <div>
                <span className="text-zinc-500 block">Streamer:</span>
                <span className="font-bold font-mono text-white text-sm">@{activeDuplicateCandidate.streamerUsername}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Fecha del registro:</span>
                <span className="font-mono text-zinc-300">{activeDuplicateCandidate.date}</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed pt-1 border-t border-zinc-800">
                Existe un registro con este usuario en la base de datos actual. No sobrescribimos silenciosamente. ¿Deseas fusionar las métricas de esta importación?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleResolveDuplicateMerge(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                No fusionar (Ignorar)
              </button>
              <button
                onClick={() => handleResolveDuplicateMerge(true)}
                className="px-4 py-2 rounded-xl bg-[#53FC18] hover:bg-[#45dc12] text-black text-xs font-bold transition-colors shadow-lg"
              >
                Confirmar Fusión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 1: CRUD Channel List */}
      {view === 'crud' && !editingStreamer && !isNewStreamer && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111619] p-4 rounded-xl border border-zinc-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por @usuario o nombre..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#141a1d] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18]"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Canal Manual</span>
            </button>
          </div>

          {/* Streamers Table */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#0e1315] text-zinc-400 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Seguidores</th>
                    <th className="py-3 px-4 text-right">Avg Viewers</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Última verificación</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredStreamers.map((s) => {
                    const statusInfo = getStatusInfo(s.status);
                    return (
                      <tr key={s.id} className="hover:bg-[#161f23]/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={s.avatarUrl}
                              alt={s.displayName}
                              className="w-8 h-8 rounded-lg object-cover border border-zinc-700"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold font-sans text-white block truncate">
                                {s.displayName}
                              </span>
                              <span className="text-[11px] text-[#53FC18]">@{s.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300">{s.primaryCategory}</td>
                        <td className="py-3 px-4 text-right text-white font-bold">
                          {formatNumber(s.followers.value)}
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400">
                          {formatNumber(s.avgViewers.value)}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${statusInfo.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-400">
                          {formatDate(s.verificationDate)}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Editar métricas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStreamer(s.id, s.username)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar canal"
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
          </div>
        </div>
      )}

      {/* View 2: Dashboard de Calidad de Datos (Requirement 17: /admin/quality) */}
      {view === 'audit' && (
        <div className="mt-6 space-y-6">
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-[#53FC18]" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    CALIDAD DE DATOS (/admin/quality)
                  </h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Auditoría completa de integridad, métricas faltantes, fuentes y antigüedad de registros.
                </p>
              </div>

              <button
                onClick={runAudit}
                disabled={auditLoading}
                className="px-4 py-2 bg-[#18231d] border border-[#53FC18]/40 hover:border-[#53FC18] text-[#53FC18] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Re-ejecutar Auditoría</span>
              </button>
            </div>

            {/* Health Metrics Grid (Requirement 17) */}
            {auditReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-6">
                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Canales</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {auditReport.totalChannels}
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Snapshots</span>
                  <span className="text-lg font-bold font-mono text-sky-400">
                    {auditReport.totalSnapshots ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Fuentes</span>
                  <span className="text-lg font-bold font-mono text-purple-400">
                    {auditReport.sourcesCount ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Datos completos</span>
                  <span className="text-lg font-bold font-mono text-[#53FC18]">
                    {auditReport.completePercent ?? 0}%
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Incompletos</span>
                  <span className={`text-lg font-bold font-mono ${(auditReport.incompletePercent ?? 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {auditReport.incompletePercent ?? 0}%
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Datos antiguos</span>
                  <span className={`text-lg font-bold font-mono ${auditReport.needsUpdateCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {auditReport.needsUpdateCount}
                  </span>
                  <span className="text-[9px] text-zinc-600 block">&gt;60 días</span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Duplicados</span>
                  <span className={`text-lg font-bold font-mono ${auditReport.duplicatesCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                    {auditReport.duplicatesCount}
                  </span>
                </div>

                <div className="p-3 bg-[#0e1315] border border-zinc-800 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">Registros DEMO</span>
                  <span className="text-lg font-bold font-mono text-amber-300">
                    {auditReport.demoCount ?? 0}
                  </span>
                </div>
              </div>
            )}

            {/* List of Detected Issues (Requirement 17: Each issue opens the affected record) */}
            {auditReport && (
              <div className="mt-6">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                  Lista de Inconsistencias y Problemas Detectados ({auditReport.issues.length})
                </h3>

                {auditReport.issues.length === 0 ? (
                  <div className="p-6 bg-[#121c16] border border-[#53FC18]/30 rounded-xl text-center text-xs text-[#53FC18] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>¡Excelente! No se detectaron inconsistencias de calidad en la base de datos actual.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {auditReport.issues.map((issue, idx) => {
                      const cleanTarget = issue.target.replace('@', '');
                      const matchedStreamer = streamers.find(
                        (s) => s.username === cleanTarget || s.displayName === issue.target
                      );

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            issue.type === 'error'
                              ? 'bg-rose-950/20 border-rose-800/60 text-rose-300'
                              : 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {issue.type === 'error' ? (
                              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className="font-mono font-bold text-white mr-2">{issue.target}</span>
                              <span className="text-zinc-300">{issue.message}</span>
                              <span className="ml-2 text-[10px] text-zinc-500 font-mono">[{issue.category}]</span>
                            </div>
                          </div>

                          {matchedStreamer && (
                            <button
                              onClick={() => handleOpenEdit(matchedStreamer)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[11px] self-start sm:self-auto flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Abrir registro afectado</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 3: Importación Masiva (JSON / CSV en 2 Pasos) (Requirement 27) */}
      {view === 'import' && (
        <div className="mt-6 space-y-6">
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-5 h-5 text-[#53FC18]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Importación Masiva (JSON o CSV)
                  </h3>
                </div>
                <p className="text-xs text-zinc-400">
                  Flujo seguro en dos pasos: análisis, validación de campos, detección de duplicados y confirmación explícita.
                </p>
              </div>

              {/* Format Toggle */}
              <div className="flex items-center gap-1 bg-[#141a1d] p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setImportFormat('json')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    importFormat === 'json' ? 'bg-[#18231d] text-[#53FC18]' : 'text-zinc-400'
                  }`}
                >
                  Formato JSON
                </button>
                <button
                  onClick={() => setImportFormat('csv')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    importFormat === 'csv' ? 'bg-[#18231d] text-[#53FC18]' : 'text-zinc-400'
                  }`}
                >
                  Formato CSV
                </button>
              </div>
            </div>

            {/* Input area */}
            <div className="mt-4">
              <label className="text-[11px] font-bold text-zinc-400 block mb-2">
                Pega el contenido {importFormat.toUpperCase()} o arrastra un archivo:
              </label>
              <textarea
                rows={8}
                value={rawImportInput}
                onChange={(e) => {
                  setRawImportInput(e.target.value);
                  setValidationResult(null);
                }}
                placeholder={
                  importFormat === 'json'
                    ? '{\n  "streamers": [\n    {\n      "username": "ejemplo",\n      "displayName": "Ejemplo TV",\n      "primaryCategory": "Gaming",\n      "followers": 1500\n    }\n  ]\n}'
                    : 'username,displayName,primaryCategory,followers,avgViewers\nejemplo,Ejemplo TV,Gaming,1500,85'
                }
                className="w-full bg-[#0e1315] font-mono text-[11px] text-zinc-300 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-[#53FC18]"
              />
            </div>

            {/* Step 1 Action */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={handleValidateImport}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#53FC18]" />
                <span>Paso 1: Analizar y Validar</span>
              </button>

              <span className="text-[11px] text-zinc-500">
                Nunca guarda automáticamente antes de que revises el resumen.
              </span>
            </div>

            {/* Validation Summary Report (Requirement 27) */}
            {validationResult && (
              <div className="mt-5 p-4 rounded-xl border bg-[#0d1214] border-zinc-700 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-[#53FC18]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="text-xs font-bold text-white">
                      {validationResult.valid
                        ? 'Validación Exitosa — Listo para Guardar'
                        : 'Se detectaron errores en la entrada'}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                  <div className="p-2.5 bg-black/40 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Registros válidos:</span>
                    <span className="text-base font-mono font-bold text-white">
                      {validationResult.validCount}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Modificados:</span>
                    <span className="text-base font-mono font-bold text-sky-400">
                      {validationResult.modifiedCount}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Nuevos:</span>
                    <span className="text-base font-mono font-bold text-[#53FC18]">
                      {validationResult.newCount}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Errores:</span>
                    <span className={`text-base font-mono font-bold ${validationResult.errorCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {validationResult.errorCount}
                    </span>
                  </div>
                </div>

                {/* Errors List */}
                {validationResult.errors.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-rose-400 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings List */}
                {validationResult.warnings.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {validationResult.warnings.map((warn, i) => (
                      <div key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 2 Apply Button */}
                {validationResult.valid && (
                  <div className="pt-3 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={handleApplyValidatedImport}
                      disabled={isApplyingImport}
                      className="px-6 py-2.5 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isApplyingImport ? 'Guardando...' : 'Paso 2: Confirmar y Guardar en la Base de Datos'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 4: Copias de Seguridad (Backup & Restore) (Requirement 28) */}
      {view === 'backup' && (
        <div className="mt-6 space-y-6">
          {/* Export Full Backup Box */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-[#53FC18]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Exportar Backup Completo del Sistema
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Genera un archivo JSON con la totalidad de los datos: perfiles de streamers, histórico de snapshots, categorías y el reporte de auditoría actual. Permite respaldar toda tu información a costo $0.
            </p>
            <button
              onClick={handleExportFullBackup}
              className="px-5 py-2.5 bg-[#141a1d] hover:bg-[#1b2327] border border-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-[#53FC18]" />
              <span>Descargar Archivo de Respaldo Completo (.json)</span>
            </button>
          </div>

          {/* Restore Full Backup Box */}
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Restaurar Backup Local
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              Pega el contenido del archivo de respaldo JSON para restituir perfiles y snapshots.
            </p>

            <textarea
              rows={6}
              value={backupRestoreInput}
              onChange={(e) => setBackupRestoreInput(e.target.value)}
              placeholder='Pega aquí el contenido del archivo kick-analytics-mx-full-backup.json...'
              className="w-full bg-[#0e1315] font-mono text-[11px] text-zinc-300 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-400"
            />

            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => setShowRestoreConfirmModal(true)}
                disabled={!backupRestoreInput.trim()}
                className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Restaurar Copia de Seguridad</span>
              </button>

              <span className="text-[11px] text-zinc-500">
                Se mostrará una advertencia de confirmación antes de aplicar.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal (Requirement 28) */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12171a] border border-rose-600 max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">ADVERTENCIA DE RESTAURACIÓN</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Esta acción <strong>reemplazará los registros de la base de datos manual actual</strong> por los contenidos del archivo de respaldo. Asegúrate de tener una copia previa si deseas conservarlos.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRestoreConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreBackup}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Streamer Modal/Form */}
      {(editingStreamer || isNewStreamer) && (
        <form onSubmit={handleSaveStreamer} className="mt-6 bg-[#111619] border border-zinc-800 rounded-2xl p-6 shadow-xl text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
            <h2 className="text-base font-bold text-white">
              {isNewStreamer ? 'Registrar Nuevo Canal' : `Editar Canal @${editingStreamer?.username}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingStreamer(null);
                setIsNewStreamer(false);
              }}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Nombre artístico / canal</label>
              <input
                type="text"
                required
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Usuario KICK (@username)</label>
              <input
                type="text"
                required
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Categoría Principal</label>
              <input
                type="text"
                required
                value={formData.primaryCategory || ''}
                onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Estado de la República / Ciudad</label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Ej. Jalisco, CDMX, Nuevo León"
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Seguidores observados</label>
              <input
                type="number"
                min="0"
                value={formData.followers?.value ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    followers: {
                      ...formData.followers!,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Espectadores promedio (Avg Viewers)</label>
              <input
                type="number"
                min="0"
                value={formData.avgViewers?.value ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    avgViewers: {
                      ...formData.avgViewers!,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Pico de espectadores (Peak Viewers)</label>
              <input
                type="number"
                min="0"
                value={formData.peakViewers?.value ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    peakViewers: {
                      ...formData.peakViewers!,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Horas transmitidas acumuladas</label>
              <input
                type="number"
                min="0"
                value={formData.hoursStreamed?.value ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hoursStreamed: {
                      ...formData.hoursStreamed!,
                      value: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setEditingStreamer(null);
                setIsNewStreamer(false);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#53FC18] hover:bg-[#45dc12] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Canal</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Verificación Automatizada de Fase 7 */}
      {showTestModal && testResults && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111619] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#141a1d]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#53FC18]" />
                <h3 className="text-base font-bold text-white">
                  Verificación de Pruebas Unitarias &amp; Compliance — Fase 7
                </h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-black/40 border-b border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">Total pruebas: <strong className="text-white font-mono">{testResults.total}</strong></span>
                <span className="text-emerald-400">Aprobadas: <strong className="font-mono">{testResults.passed}</strong></span>
                {testResults.failed > 0 && (
                  <span className="text-rose-400">Fallidas: <strong className="font-mono">{testResults.failed}</strong></span>
                )}
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  testResults.allPassed
                    ? 'bg-emerald-950/70 text-[#53FC18] border border-emerald-800/40'
                    : 'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                }`}
              >
                {testResults.allPassed ? '100% CONFORME' : 'ERRORES DETECTADOS'}
              </span>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 text-xs">
              {testResults.results.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#141a1d] border border-zinc-800/80 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-500">#{idx + 1}</span>
                      <span className="font-semibold text-white">{t.testName}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {t.suiteName}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-3 font-mono">
                      <span>Esperado: <strong className="text-zinc-300">{t.expected}</strong></span>
                      <span>Obtenido: <strong className="text-zinc-200">{t.actual}</strong></span>
                    </div>
                    {t.details && (
                      <p className="text-[10px] text-zinc-500 italic mt-0.5">{t.details}</p>
                    )}
                  </div>
                  <div>
                    {t.passed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-[#53FC18] border border-emerald-800">
                        PASÓ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                        FALLÓ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-[#141a1d] flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
