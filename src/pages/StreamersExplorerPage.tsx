import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { Streamer, StreamerStatus } from '../types';
import {
  formatCompactNumber,
  formatNumber,
  formatHours,
  formatDate,
  getStatusInfo,
  getCategoryBadgeColor,
} from '../utils/formatters';
import { PageRoute } from '../components/Navigation';

interface StreamersExplorerPageProps {
  streamers: Streamer[];
  onNavigate: (route: PageRoute, params?: { username?: string }) => void;
}

type SortField = 'followers' | 'avgViewers' | 'peakViewers' | 'hoursStreamed' | 'displayName' | 'lastStream';
type SortOrder = 'asc' | 'desc';

export const StreamersExplorerPage: React.FC<StreamersExplorerPageProps> = ({
  streamers,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegionalFilter, setSelectedRegionalFilter] = useState<'verified_mx' | 'all' | 'pending_regional'>('verified_mx');
  const [sortField, setSortField] = useState<SortField>('followers');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const itemsPerPage = 10;

  const categoriesList = [
    'IRL',
    'Just Chatting',
    'Gaming',
    'Fortnite',
    'Minecraft',
    'VALORANT',
    'Call of Duty',
    'Fútbol',
    'Noticias',
    'Entretenimiento',
    'Otros',
  ];

  const statusList: { value: StreamerStatus; label: string }[] = [
    { value: 'active', label: 'Activo' },
    { value: 'low_activity', label: 'Poco activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'eliminado' as unknown as StreamerStatus, label: 'Eliminado' },
    { value: 'suspended', label: 'Suspendido' },
    { value: 'unverifiable', label: 'No verificable' },
  ];

  // Filtering and Sorting
  const filteredAndSorted = useMemo(() => {
    let list = [...streamers];

    // Filter by regional verification (Requirement 25)
    if (selectedRegionalFilter === 'verified_mx') {
      list = list.filter((s) => s.country && s.country.toLowerCase() === 'méxico');
    } else if (selectedRegionalFilter === 'pending_regional') {
      list = list.filter((s) => !s.country || s.country.toLowerCase() !== 'méxico');
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      list = list.filter((s) => s.status === selectedStatus);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((s) =>
        s.primaryCategory.toLowerCase() === selectedCategory.toLowerCase() ||
        s.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase())
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
      list = list.filter(
        (s) =>
          s.username.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.primaryCategory.toLowerCase().includes(q) ||
          s.state?.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'followers') {
        valA = a.followers.value ?? -1;
        valB = b.followers.value ?? -1;
      } else if (sortField === 'avgViewers') {
        valA = a.avgViewers.value ?? -1;
        valB = b.avgViewers.value ?? -1;
      } else if (sortField === 'peakViewers') {
        valA = a.peakViewers.value ?? -1;
        valB = b.peakViewers.value ?? -1;
      } else if (sortField === 'hoursStreamed') {
        valA = a.hoursStreamed.value ?? -1;
        valB = b.hoursStreamed.value ?? -1;
      } else if (sortField === 'lastStream') {
        valA = a.lastStreamDate ? new Date(a.lastStreamDate).getTime() : 0;
        valB = b.lastStreamDate ? new Date(b.lastStreamDate).getTime() : 0;
      } else if (sortField === 'displayName') {
        return sortOrder === 'asc'
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName);
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [streamers, selectedRegionalFilter, selectedStatus, selectedCategory, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const paginatedList = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const activeFiltersCount =
    (selectedStatus !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedRegionalFilter !== 'verified_mx' ? 1 : 0);

  return (
    <div id="streamers-page" className="w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explorador de Streamers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Métricas objetivas y contadores observados de canales de KICK México.
          </p>
        </div>

        {/* View Mode Toggle & Mobile Filter Button */}
        <div className="flex items-center gap-2">
          {/* Mobile Filter Drawer Trigger */}
          <button
            onClick={() => setShowFilterDrawer(true)}
            className="md:hidden flex items-center gap-2 px-3 py-2 bg-[#13191c] border border-zinc-800 rounded-lg text-xs text-slate-200 font-medium"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#53FC18]" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#53FC18] text-black text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Table vs Cards switcher */}
          <div className="flex items-center bg-[#13191c] border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-[#1e2a22] text-[#53FC18]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista de tabla completa"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'cards' ? 'bg-[#1e2a22] text-[#53FC18]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista de tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Filter Bar & Search */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            id="streamers-search-input"
            type="text"
            placeholder="Buscar por @usuario, nombre, categoría o estado..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#111619] border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#53FC18]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop inline filters */}
        <div className="hidden md:flex items-center gap-2">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111619] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#53FC18]/50"
          >
            <option value="all">Todos los estados</option>
            {statusList.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#111619] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#53FC18]/50"
          >
            <option value="all">Todas las categorías</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Country / Regional verification filter (Requirement 25) */}
          <select
            value={selectedRegionalFilter}
            onChange={(e) => {
              setSelectedRegionalFilter(e.target.value as 'verified_mx' | 'all' | 'pending_regional');
              setCurrentPage(1);
            }}
            className="bg-[#111619] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-[#53FC18] font-semibold focus:outline-none"
          >
            <option value="verified_mx">🇲🇽 STREAMERS VERIFICADOS MX</option>
            <option value="all">🌐 TODOS EN KICK</option>
            <option value="pending_regional">⏳ PENDIENTE VERIFICACIÓN REGIONAL</option>
          </select>
        </div>
      </div>

      {/* Results Count & Active Filter Pills */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <div>
          Mostrando <strong className="text-white">{filteredAndSorted.length}</strong> canales
          {searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </div>

        {(selectedStatus !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="text-[11px] text-[#53FC18] hover:underline cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Main Content: Table View or Cards View */}
      {paginatedList.length === 0 ? (
        <div className="mt-8 p-12 bg-[#111619] border border-zinc-800 rounded-xl text-center">
          <p className="text-sm font-semibold text-slate-300">No se encontraron canales con los filtros seleccionados.</p>
          <p className="text-xs text-zinc-500 mt-1">Prueba seleccionando &quot;Todos los estados&quot; o borrando tu búsqueda.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Full Desktop/Tablet Table */
        <div className="mt-4 bg-[#111619] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0e1315] border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('displayName')}>
                    <div className="flex items-center gap-1">
                      Streamer / @KICK
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer text-right" onClick={() => toggleSort('followers')}>
                    <div className="flex items-center justify-end gap-1">
                      Seguidores
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer text-right" onClick={() => toggleSort('avgViewers')}>
                    <div className="flex items-center justify-end gap-1">
                      Avg viewers
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer text-right" onClick={() => toggleSort('peakViewers')}>
                    <div className="flex items-center justify-end gap-1">
                      Pico
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer text-right" onClick={() => toggleSort('hoursStreamed')}>
                    <div className="flex items-center justify-end gap-1">
                      Horas
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3 cursor-pointer" onClick={() => toggleSort('lastStream')}>
                    <div className="flex items-center gap-1">
                      Último directo
                      <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {paginatedList.map((s) => {
                  const st = getStatusInfo(s.status);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onNavigate('streamer_detail', { username: s.username })}
                      className="hover:bg-[#161e22] cursor-pointer transition-colors group"
                    >
                      {/* Streamer details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.avatarUrl}
                            alt={s.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white group-hover:text-[#53FC18] transition-colors block truncate">
                              {s.displayName}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400 block flex items-center gap-1.5">
                              <span>@{s.username}</span>
                              <span className="text-zinc-600">•</span>
                              {s.country === 'México' ? (
                                <span className="text-slate-300">{s.state ? `${s.state}, MX` : 'México'}</span>
                              ) : (
                                <span className="text-zinc-500 italic text-[10px]">PAÍS: NO DISPONIBLE</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Followers */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {s.followers.value !== null ? formatNumber(s.followers.value) : 'NO DISPONIBLE'}
                      </td>

                      {/* Avg viewers */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#53FC18]">
                        {s.avgViewers.value !== null ? formatNumber(s.avgViewers.value) : 'NO DISPONIBLE'}
                      </td>

                      {/* Peak viewers */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {s.peakViewers.value !== null ? formatNumber(s.peakViewers.value) : 'NO DISPONIBLE'}
                      </td>

                      {/* Hours streamed */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {s.hoursStreamed.value !== null ? formatHours(s.hoursStreamed.value) : 'NO DISPONIBLE'}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${getCategoryBadgeColor(s.primaryCategory)}`}>
                          {s.primaryCategory}
                        </span>
                      </td>

                      {/* Last Stream */}
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                        {formatDate(s.lastStreamDate)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View (Especially great for mobile Android touch) */
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedList.map((s) => {
            const st = getStatusInfo(s.status);
            return (
              <div
                key={s.id}
                onClick={() => onNavigate('streamer_detail', { username: s.username })}
                className="bg-[#111619] border border-zinc-800 hover:border-[#53FC18]/50 rounded-xl p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={s.avatarUrl}
                      alt={s.displayName}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white group-hover:text-[#53FC18] truncate">
                        {s.displayName}
                      </h3>
                      <div className="font-mono text-xs text-zinc-400">@{s.username}</div>
                      <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] border ${getCategoryBadgeColor(s.primaryCategory)}`}>
                        {s.primaryCategory}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${st.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-sans block">Seguidores</span>
                    <span className="font-bold text-white">
                      {s.followers.value !== null ? formatNumber(s.followers.value) : 'NO DISPONIBLE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-sans block">Avg viewers</span>
                    <span className="font-bold text-[#53FC18]">
                      {s.avgViewers.value !== null ? formatNumber(s.avgViewers.value) : 'NO DISPONIBLE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-sans block">Pico máximo</span>
                    <span className="text-zinc-300">
                      {s.peakViewers.value !== null ? formatNumber(s.peakViewers.value) : 'NO DISPONIBLE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-sans block">Horas transmitidas</span>
                    <span className="text-zinc-300">
                      {s.hoursStreamed.value !== null ? formatHours(s.hoursStreamed.value) : 'NO DISPONIBLE'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Último directo: {formatDate(s.lastStreamDate)}</span>
                  <span className="flex items-center gap-0.5 text-zinc-400">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    {s.country === 'México' ? (s.state || 'México') : <span className="italic text-zinc-500">PAÍS: NO DISPONIBLE</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-xs text-zinc-400 pt-4 border-t border-zinc-800">
          <div>
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-[#13191c] border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#13191c] border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filters Drawer Overlay */}
      {showFilterDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end md:hidden"
          onClick={() => setShowFilterDrawer(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-[#0f1417] border-l border-zinc-800 h-full p-5 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <h3 className="font-bold text-sm text-white">Filtrar Canales</h3>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Section */}
              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Estado del canal
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedStatus('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                      selectedStatus === 'all'
                        ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Todos
                  </button>
                  {statusList.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => setSelectedStatus(st.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                        selectedStatus === st.value
                          ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Section */}
              <div className="mt-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#141a1d] border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categoriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSelectedCategory('all');
                  setShowFilterDrawer(false);
                }}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
              >
                Restablecer
              </button>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="w-full py-2.5 bg-[#53FC18] hover:bg-[#45dc12] text-black rounded-lg text-xs font-bold"
              >
                Aplicar Filtros ({filteredAndSorted.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
