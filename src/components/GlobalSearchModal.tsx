import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Tag, Building2, ExternalLink } from 'lucide-react';
import { Streamer } from '../types';
import { formatCompactNumber, getCategoryBadgeColor } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamers: Streamer[];
  onSelectStreamer: (username: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  streamers,
  onSelectStreamer,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle handled by parent
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim().replace(/^@/, '');

  const filtered = query.trim()
    ? streamers.filter((s) => {
        const matchName = s.displayName.toLowerCase().includes(normalizedQuery);
        const matchUsername = s.username.toLowerCase().includes(normalizedQuery);
        const matchPublicName = s.publicName?.toLowerCase().includes(normalizedQuery);
        const matchCategory = s.categories.some((c) => c.toLowerCase().includes(normalizedQuery)) || s.primaryCategory.toLowerCase().includes(normalizedQuery);
        const matchCity = s.city?.toLowerCase().includes(normalizedQuery);
        const matchState = s.state?.toLowerCase().includes(normalizedQuery);
        const matchCountry = s.country?.toLowerCase().includes(normalizedQuery);
        const matchOrg = s.organization?.toLowerCase().includes(normalizedQuery);
        const matchId = s.id.toLowerCase().includes(normalizedQuery);
        return matchName || matchUsername || matchPublicName || matchCategory || matchCity || matchState || matchCountry || matchOrg || matchId;
      })
    : streamers.slice(0, 5); // show top 5 suggestions initially

  return (
    <div
      id="global-search-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4 pb-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#101416] border border-zinc-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center gap-3 bg-[#13191c]">
          <Search className="w-5 h-5 text-[#53FC18] flex-shrink-0" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Buscar por @usuario, nombre, categoría, estado o ciudad..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
          >
            ESC
          </button>
        </div>

        {/* Search Suggestions & Results */}
        <div className="overflow-y-auto p-2 divide-y divide-zinc-900/60">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {query.trim() ? `Resultados encontrados (${filtered.length})` : 'Canales sugeridos'}
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No se encontraron canales que coincidan con &quot;{query}&quot;.
              <p className="text-xs text-zinc-600 mt-1">Prueba buscando por @lonche, IRL, Jalisco, o CDMX</p>
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectStreamer(s.username);
                  onClose();
                }}
                className="p-3 hover:bg-[#161d21] rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={s.avatarUrl}
                    alt={s.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-700/80 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white group-hover:text-[#53FC18] transition-colors truncate">
                        {s.displayName}
                      </span>
                      <span className="font-mono text-xs text-zinc-400">@{s.username}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                      <span className={`px-1.5 py-0.2 rounded border text-[10px] ${getCategoryBadgeColor(s.primaryCategory)}`}>
                        {s.primaryCategory}
                      </span>

                      {s.state && (
                        <span className="flex items-center gap-0.5 text-zinc-400">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {s.state}
                        </span>
                      )}

                      {s.organization && (
                        <span className="flex items-center gap-0.5 text-zinc-400">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          {s.organization}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-xs font-bold text-white">
                    {formatCompactNumber(s.followers.value)}
                  </div>
                  <div className="text-[10px] text-zinc-500">seguidores</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-[#0d1113] border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between px-4">
          <span>Búsqueda objetiva en KICK México</span>
          <span className="text-[#53FC18]">Presiona sobre un canal para ver su ficha</span>
        </div>
      </div>
    </div>
  );
};
