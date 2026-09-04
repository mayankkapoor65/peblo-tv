import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { ShowsListPage } from './pages/ShowsListPage';
import { ShowFormPage } from './pages/ShowFormPage';
import { SeasonEpisodeManager } from './pages/SeasonEpisodeManager';
import { PublishPage } from './pages/PublishPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 10,
    },
  },
});

export function AppContent() {
  const [activeTab, setActiveTab] = useState<'shows' | 'publish'>('shows');
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'episodes'>('list');
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);

  const handleEditShow = (showId: string) => {
    setSelectedShowId(showId);
    setCurrentView('edit');
  };

  const handleManageEpisodes = (showId: string) => {
    setSelectedShowId(showId);
    setCurrentView('episodes');
  };

  const handleCreateShow = () => {
    setSelectedShowId(null);
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setSelectedShowId(null);
    setCurrentView('list');
  };

  const handleSaved = (showId: string) => {
    setSelectedShowId(showId);
    setCurrentView('list');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-slate-950">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'shows') setCurrentView('list');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pb-16">
        {activeTab === 'publish' ? (
          <PublishPage
            onNavigateToShow={(showId) => {
              setActiveTab('shows');
              setSelectedShowId(showId);
              setCurrentView('edit');
            }}
          />
        ) : currentView === 'create' ? (
          <ShowFormPage onBack={handleBackToList} onSaved={handleSaved} />
        ) : currentView === 'edit' ? (
          <ShowFormPage showId={selectedShowId} onBack={handleBackToList} onSaved={handleSaved} />
        ) : currentView === 'episodes' && selectedShowId ? (
          <SeasonEpisodeManager showId={selectedShowId} onBack={handleBackToList} />
        ) : (
          <ShowsListPage
            onCreateShow={handleCreateShow}
            onEditShow={handleEditShow}
            onManageEpisodes={handleManageEpisodes}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Peblo TV Mini — Platform Engineering Edition</span>
          <span className="font-mono text-[11px]">Storage: Local / S3 Abstraction • Atomic Publisher</span>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
