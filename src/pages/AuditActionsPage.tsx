import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Download,
  Clock,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';
import { AuditActionLog } from '../types';
import { dataService } from '../services/dataService';

export const AuditActionsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditActionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const auditActions = await dataService.sync.getAuditActions();
      setLogs(auditActions);
    } catch {
      // Error loading
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = selectedCategory === 'ALL' || log.category === selectedCategory;
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kick_analytics_mx_auditoria_sistema_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> REQUERIMIENTOS 43, 51 — AUDITORÍA Y TRAZABILIDAD
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            BITÁCORA DE AUDITORÍA DEL SISTEMA
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Registro inmutable de acciones administrativas: importaciones, rollbacks, cambios de proveedores y manipulaciones de estado.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#53FC18]" />
            Exportar Bitácora
          </button>
        </div>
      </div>

      {/* Controles de filtrado */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar en bitácora por título, detalle u operador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#12191c] border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'IMPORT', 'ROLLBACK', 'PROVIDER', 'MANUAL_EDIT', 'EXPORT'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-mono border whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de entradas de auditoría */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-[#12191c] border border-zinc-800 rounded-2xl space-y-2">
            <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto" />
            <span className="font-mono text-xs text-zinc-400 block">No se encontraron eventos de auditoría</span>
            <p className="text-xs text-zinc-500">Las acciones críticas quedarán registradas aquí automáticamente.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-[#12191c] border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${
                      log.category === 'IMPORT'
                        ? 'bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/30'
                        : log.category === 'ROLLBACK'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : log.category === 'PROVIDER'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {log.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">{log.title}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span>•</span>
                  <span className="text-zinc-400">{log.operator}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 font-mono pl-0.5">{log.details}</p>

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="pt-1 text-[10px] font-mono text-zinc-500">
                  Metadata: {JSON.stringify(log.metadata)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
