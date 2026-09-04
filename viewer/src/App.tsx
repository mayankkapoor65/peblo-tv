import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { ShowDetailPage } from './pages/ShowDetailPage';
import { TrailerModal } from './components/TrailerModal';
import { CatalogShow, CatalogTrailer } from './types';
import { catalogApi } from './api/catalog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute stale time for published catalogue
    },
  },
});

export function ViewerAppContent() {
  const [currentTab, setCurrentTab] = useState<'home' | 'search'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [detailShow, setDetailShow] = useState<CatalogShow | null>(null);
  const [trailerShow, setTrailerShow] = useState<{ show: CatalogShow; trailer?: CatalogTrailer | null } | null>(null);

  // Prefetch catalogue for quick access to show objects
  const { data: catalog } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => catalogApi.getCatalog(),
  });

  const handleOpenDetails = (show: CatalogShow) => {
    setDetailShow(show);
  };

  const handlePlayTrailer = (show: CatalogShow, trailer?: CatalogTrailer | null) => {
    setTrailerShow({ show, trailer });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05070c] text-slate-100 selection:bg-brand-500 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          if (q && currentTab !== 'search') setCurrentTab('search');
        }}
      />

      <main className="flex-1">
        {currentTab === 'home' ? (
          <HomePage
            onOpenDetails={handleOpenDetails}
            onPlayTrailer={(s) => handlePlayTrailer(s)}
          />
        ) : (
          <SearchPage
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenDetails={handleOpenDetails}
            onPlayTrailer={(s) => handlePlayTrailer(s)}
            allCatalogShows={catalog?.all_shows || []}
          />
        )}
      </main>

      {/* Show Details Modal */}
      {detailShow && (
        <ShowDetailPage
          show={detailShow}
          onClose={() => setDetailShow(null)}
          onPlayTrailer={(s) => handlePlayTrailer(s)}
        />
      )}

      {/* Trailer Modal (Season 0 Player) */}
      {trailerShow && (
        <TrailerModal
          show={trailerShow.show}
          initialTrailer={trailerShow.trailer}
          onClose={() => setTrailerShow(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-10 px-6 sm:px-12 text-slate-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-white text-sm">PEBLO TV</span>
            <span>• Cinema Consumer Experience</span>
          </div>
          <div className="flex items-center space-x-6">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition"
            >
              CMS Administration
            </a>
            <a
              href="/catalog"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition font-mono"
            >
              Raw Published JSON
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ViewerAppContent />
    </QueryClientProvider>
  );
}

export default App;
