import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Grid3X3,
  MapPin,
  GitCompare,
  FileSpreadsheet,
  BookOpen,
  Bell,
  Settings,
  Search,
  Menu,
  X,
  Home,
  ShieldCheck,
  ChevronRight,
  UploadCloud,
  Database,
  HardDrive,
  History,
  ShieldAlert,
  HelpCircle,
  Server,
  Compass,
  Activity,
} from 'lucide-react';

export type PageRoute =
  | 'landing'
  | 'dashboard'
  | 'analitica'
  | 'streamers'
  | 'streamer_detail'
  | 'emergentes'
  | 'categorias'
  | 'mexico'
  | 'comparar'
  | 'reportes'
  | 'metodologia'
  | 'alertas'
  | 'admin'
  | 'admin_import'
  | 'admin_quality'
  | 'admin_backup'
  | 'admin_connectors'
  | 'admin_cobertura'
  | 'admin_compliance'
  | 'importador'
  | 'datos'
  | 'admin_storage'
  | 'admin_updates'
  | 'admin_audit'
  | 'ayuda';

interface NavigationProps {
  currentRoute: PageRoute;
  onRouteChange: (route: PageRoute) => void;
  onOpenSearch: () => void;
  isDemoMode: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  onRouteChange,
  onOpenSearch,
  isDemoMode,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const mainNavItems: { route: PageRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { route: 'analitica', label: 'Analítica', icon: Activity },
    { route: 'streamers', label: 'Streamers', icon: Users },
    { route: 'importador', label: 'Importador', icon: UploadCloud },
    { route: 'datos', label: 'Datos', icon: Database },
    { route: 'emergentes', label: 'Emergentes', icon: TrendingUp },
    { route: 'categorias', label: 'Categorías', icon: Grid3X3 },
    { route: 'mexico', label: 'Mapa MX', icon: MapPin },
    { route: 'comparar', label: 'Comparar', icon: GitCompare },
    { route: 'reportes', label: 'Reportes', icon: FileSpreadsheet },
  ];

  const secondaryNavItems: { route: PageRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { route: 'admin_cobertura', label: 'Cobertura & Monitoreo', icon: Compass },
    { route: 'admin_compliance', label: 'Compliance & Retención', icon: ShieldCheck },
    { route: 'admin_connectors', label: 'Conectores API', icon: Server },
    { route: 'alertas', label: 'Alertas', icon: Bell },
    { route: 'admin_updates', label: 'Historial / Rollback', icon: History },
    { route: 'admin_storage', label: 'Almacenamiento', icon: HardDrive },
    { route: 'admin_audit', label: 'Auditoría', icon: ShieldAlert },
    { route: 'metodologia', label: 'Metodología', icon: BookOpen },
    { route: 'ayuda', label: 'Ayuda', icon: HelpCircle },
    { route: 'admin', label: 'Administración', icon: Settings },
  ];

  const handleNavClick = (route: PageRoute) => {
    onRouteChange(route);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Top Header for Mobile & Desktop */}
      <header
        id="app-header"
        className="sticky top-0 z-40 bg-[#0c1012]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Abrir menú"
            className="md:hidden p-2 rounded-lg bg-[#141a1d] text-zinc-300 hover:text-white border border-zinc-800"
          >
            <Menu className="w-5 h-5 text-[#53FC18]" />
          </button>

          {/* Logo */}
          <div
            onClick={() => onRouteChange('landing')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-black border border-[#53FC18]/60 flex items-center justify-center font-black font-mono text-[#53FC18] text-base shadow-[0_0_10px_rgba(83,252,24,0.25)] group-hover:shadow-[0_0_15px_rgba(83,252,24,0.4)] transition-all">
              K
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm md:text-base tracking-tight text-white group-hover:text-slate-100">
                  KICK ANALYTICS
                </span>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-[#53FC18] text-black">
                  MX
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-zinc-400 -mt-0.5 tracking-wide">
                Datos públicos del ecosistema mexicano
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13191c] hover:bg-[#182024] border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#53FC18]" />
            <span className="hidden sm:inline">Buscar streamer...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 bg-zinc-800 rounded">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => onRouteChange('admin')}
            className="p-2 rounded-lg bg-[#13191c] hover:bg-[#182024] border border-zinc-800 text-zinc-400 hover:text-[#53FC18] transition-colors"
            title="Panel de administración y datos manuales"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Main Navigation Bar */}
      <nav
        id="desktop-subnav"
        className="hidden md:flex bg-[#0e1316] border-b border-zinc-800/80 px-6 py-2 items-center justify-between overflow-x-auto text-xs"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNavClick('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              currentRoute === 'landing'
                ? 'bg-[#1a2327] text-[#53FC18] border border-[#53FC18]/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Inicio
          </button>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => handleNavClick(item.route)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1a2327] text-[#53FC18] border border-[#53FC18]/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => handleNavClick(item.route)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isActive
                    ? 'text-[#53FC18] bg-[#1a2327]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer (Accessible when clicking menu hamburger) */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-[#0f1417] border-r border-zinc-800 h-full p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-black border border-[#53FC18] flex items-center justify-center font-bold text-[#53FC18] text-sm">
                    K
                  </div>
                  <span className="font-bold text-sm text-white">KICK ANALYTICS MX</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Nav Links */}
              <div className="mt-4 space-y-1">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-1">
                  Navegación Principal
                </div>
                <button
                  onClick={() => handleNavClick('landing')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentRoute === 'landing'
                      ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Home className="w-4 h-4 text-[#53FC18]" />
                    Inicio
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>

                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      onClick={() => handleNavClick(item.route)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#53FC18]" />
                        {item.label}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                  );
                })}

                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 pt-4 mb-1">
                  Recursos & Sistema
                </div>

                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      onClick={() => handleNavClick(item.route)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#18231d] text-[#53FC18] border border-[#53FC18]/30'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-zinc-400" />
                        {item.label}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer info */}
            <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 space-y-1">
              <div className="flex items-center gap-1 text-[#53FC18]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Datos 100% Públicos</span>
              </div>
              <p>Optimizado para Android y navegadores móviles.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Bar (Thumb friendly for Android users) */}
      <nav
        id="mobile-bottom-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c1012]/95 backdrop-blur-lg border-t border-zinc-800 px-2 py-1.5 flex items-center justify-around safe-area-inset-bottom"
      >
        <button
          onClick={() => onRouteChange('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg transition-colors ${
            currentRoute === 'dashboard' ? 'text-[#53FC18]' : 'text-zinc-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>

        <button
          onClick={() => onRouteChange('streamers')}
          className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg transition-colors ${
            currentRoute === 'streamers' || currentRoute === 'streamer_detail'
              ? 'text-[#53FC18]'
              : 'text-zinc-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Streamers</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center p-1.5 min-w-[56px] text-zinc-300 hover:text-white"
        >
          <div className="w-9 h-9 rounded-full bg-[#18231d] border border-[#53FC18]/60 flex items-center justify-center text-[#53FC18] -mt-3 shadow-md shadow-black/50">
            <Search className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Buscar</span>
        </button>

        <button
          onClick={() => onRouteChange('emergentes')}
          className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-lg transition-colors ${
            currentRoute === 'emergentes' ? 'text-[#53FC18]' : 'text-zinc-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Emergentes</span>
        </button>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 min-w-[56px] text-zinc-400 hover:text-slate-200"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </>
  );
};
