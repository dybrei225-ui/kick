import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, PageRoute } from './components/Navigation';
import { DemoBanner } from './components/DemoBanner';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { StreamersExplorerPage } from './pages/StreamersExplorerPage';
import { StreamerProfilePage } from './pages/StreamerProfilePage';
import { EmergentPage } from './pages/EmergentPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { MexicoMapPage } from './pages/MexicoMapPage';
import { ComparePage } from './pages/ComparePage';
import { ReportsPage } from './pages/ReportsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { AlertsPage } from './pages/AlertsPage';
import { AdminPage } from './pages/AdminPage';
import { ImportPage } from './pages/ImportPage';
import { DataCenterPage } from './pages/DataCenterPage';
import { StoragePage } from './pages/StoragePage';
import { UpdatesHistoryPage } from './pages/UpdatesHistoryPage';
import { AuditActionsPage } from './pages/AuditActionsPage';
import { ConnectorsPage } from './pages/ConnectorsPage';
import { CoveragePage } from './pages/CoveragePage';
import { CompliancePage } from './pages/CompliancePage';
import { HelpPage } from './pages/HelpPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { dataService } from './services/dataService';
import { Streamer, CategoryData, RegionMetric } from './types';
import { ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>('landing');
  const [selectedUsername, setSelectedUsername] = useState<string>('elded');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Data states
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [regions, setRegions] = useState<RegionMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  const loadAppData = useCallback(async () => {
    setLoading(true);
    const [streamerList, categoryList, regionList] = await Promise.all([
      dataService.getStreamers(),
      dataService.getCategories(),
      dataService.getRegions(),
    ]);
    setStreamers(streamerList);
    setCategories(categoryList);
    setRegions(regionList);
    setIsDemoMode(dataService.isDemo());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  // Hash-based route listener for mobile Android navigation and back-button support
  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) {
      return;
    }

    if (hash.startsWith('streamer/')) {
      const username = hash.replace('streamer/', '');
      setSelectedUsername(username);
      setCurrentRoute('streamer_detail');
    } else if (hash === 'admin/quality') {
      setCurrentRoute('admin_quality');
    } else if (hash === 'admin/import') {
      setCurrentRoute('admin_import');
    } else if (hash === 'admin/backup') {
      setCurrentRoute('admin_backup');
    } else if (hash === 'admin/storage' || hash === 'admin_storage') {
      setCurrentRoute('admin_storage');
    } else if (hash === 'admin/updates' || hash === 'admin_updates') {
      setCurrentRoute('admin_updates');
    } else if (hash === 'admin/audit' || hash === 'admin_audit') {
      setCurrentRoute('admin_audit');
    } else if (hash === 'admin/connectors' || hash === 'admin_connectors') {
      setCurrentRoute('admin_connectors');
    } else if (hash === 'admin/cobertura' || hash === 'admin_cobertura') {
      setCurrentRoute('admin_cobertura');
    } else if (hash === 'admin/compliance' || hash === 'admin_compliance') {
      setCurrentRoute('admin_compliance');
    } else if (hash === 'importador') {
      setCurrentRoute('importador');
    } else if (hash === 'datos') {
      setCurrentRoute('datos');
    } else if (hash === 'ayuda') {
      setCurrentRoute('ayuda');
    } else if (
      [
        'landing',
        'dashboard',
        'analitica',
        'streamers',
        'emergentes',
        'categorias',
        'mexico',
        'comparar',
        'reportes',
        'metodologia',
        'alertas',
        'admin',
        'admin_import',
        'admin_quality',
        'admin_backup',
        'admin_connectors',
        'admin_cobertura',
        'admin_compliance',
        'importador',
        'datos',
        'admin_storage',
        'admin_updates',
        'admin_audit',
        'ayuda',
      ].includes(hash)
    ) {
      setCurrentRoute(hash as PageRoute);
    }
  }, []);

  useEffect(() => {
    parseHash();
    const handlePopState = () => {
      parseHash();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseHash]);

  // Navigate handler that updates URL hash and scrolls smoothly to top
  const handleNavigate = (route: PageRoute, params?: { username?: string }) => {
    if (route === 'streamer_detail' && params?.username) {
      setSelectedUsername(params.username);
      window.location.hash = `#/streamer/${params.username}`;
    } else {
      window.location.hash = `#/${route}`;
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ⌘K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e10] text-slate-100 flex flex-col font-sans selection:bg-[#53FC18] selection:text-black">
      {/* Top Demo Banner for 100% transparency */}
      <DemoBanner
        isDemo={isDemoMode}
        onConfigureAdmin={() => handleNavigate('admin')}
      />

      {/* Main Navigation (Header, Desktop Subnav, Mobile Bottom bar & Drawer) */}
      <Navigation
        currentRoute={currentRoute}
        onRouteChange={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        isDemoMode={isDemoMode}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {loading ? (
          <div className="w-full max-w-xl mx-auto py-24 px-4 text-center">
            <div className="animate-spin w-10 h-10 border-2 border-[#53FC18] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-white">Iniciando KICK Analytics MX...</p>
            <p className="text-xs text-zinc-400 mt-1">Cargando base de datos observada y adaptadores...</p>
          </div>
        ) : (
          <>
            {currentRoute === 'landing' && (
              <LandingPage
                onNavigate={handleNavigate}
                streamers={streamers}
                categories={categories}
              />
            )}

            {currentRoute === 'dashboard' && (
              <DashboardPage
                onNavigate={handleNavigate}
                streamers={streamers}
                categories={categories}
              />
            )}

            {currentRoute === 'analitica' && (
              <AnalyticsPage
                streamers={streamers}
                categories={categories}
                onSelectStreamer={(username) =>
                  handleNavigate('streamer_detail', { username })
                }
              />
            )}

            {currentRoute === 'streamers' && (
              <StreamersExplorerPage
                streamers={streamers}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'streamer_detail' && (
              <StreamerProfilePage
                username={selectedUsername}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'emergentes' && (
              <EmergentPage onNavigate={handleNavigate} />
            )}

            {currentRoute === 'categorias' && (
              <CategoriesPage
                categories={categories}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'mexico' && (
              <MexicoMapPage
                regions={regions}
                streamers={streamers}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'comparar' && (
              <ComparePage
                streamers={streamers}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'reportes' && (
              <ReportsPage
                streamers={streamers}
                categories={categories}
              />
            )}

            {currentRoute === 'metodologia' && <MethodologyPage />}

            {currentRoute === 'alertas' && (
              <AlertsPage onNavigate={handleNavigate} />
            )}

            {currentRoute === 'admin' && (
              <AdminPage
                streamers={streamers}
                onRefresh={loadAppData}
                onNavigate={handleNavigate}
                subView="crud"
              />
            )}

            {currentRoute === 'admin_import' && (
              <AdminPage
                streamers={streamers}
                onRefresh={loadAppData}
                onNavigate={handleNavigate}
                subView="import"
              />
            )}

            {currentRoute === 'admin_quality' && (
              <AdminPage
                streamers={streamers}
                onRefresh={loadAppData}
                onNavigate={handleNavigate}
                subView="audit"
              />
            )}

            {currentRoute === 'admin_backup' && (
              <AdminPage
                streamers={streamers}
                onRefresh={loadAppData}
                onNavigate={handleNavigate}
                subView="backup"
              />
            )}

            {currentRoute === 'admin_connectors' && (
              <ConnectorsPage />
            )}

            {currentRoute === 'admin_cobertura' && (
              <CoveragePage />
            )}

            {currentRoute === 'admin_compliance' && (
              <CompliancePage />
            )}

            {currentRoute === 'importador' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <ImportPage />
              </div>
            )}

            {currentRoute === 'datos' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <DataCenterPage />
              </div>
            )}

            {currentRoute === 'admin_storage' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <StoragePage />
              </div>
            )}

            {currentRoute === 'admin_updates' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <UpdatesHistoryPage />
              </div>
            )}

            {currentRoute === 'admin_audit' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <AuditActionsPage />
              </div>
            )}

            {currentRoute === 'ayuda' && (
              <div className="max-w-7xl mx-auto px-4 py-8">
                <HelpPage />
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        streamers={streamers}
        onSelectStreamer={(username) => {
          setIsSearchOpen(false);
          handleNavigate('streamer_detail', { username });
        }}
      />

      {/* App Footer */}
      <footer className="hidden md:block bg-[#080b0c] border-t border-zinc-800/80 py-8 px-6 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-black border border-[#53FC18]/60 flex items-center justify-center font-bold text-[#53FC18] text-xs font-mono">
              K
            </div>
            <span className="font-bold text-white">KICK ANALYTICS MX</span>
            <span className="text-zinc-600">|</span>
            <span>Inteligencia de streaming para México</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => handleNavigate('metodologia')}
              className="hover:text-white transition-colors"
            >
              Metodología
            </button>
            <button
              onClick={() => handleNavigate('reportes')}
              className="hover:text-white transition-colors"
            >
              Generar Reporte
            </button>
            <button
              onClick={() => handleNavigate('admin')}
              className="hover:text-white transition-colors"
            >
              Panel Administrativo
            </button>
          </div>

          <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#53FC18]" />
            <span>Proyecto analítico independiente. No afiliado a KICK.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
