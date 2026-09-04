import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, Sparkles, Tv } from 'lucide-react';
import { catalogApi } from '../api/catalog';
import { CatalogShow } from '../types';
import { HeroBanner } from '../components/HeroBanner';
import { SectionRow } from '../components/SectionRow';
import { HeroSkeleton, SectionRowSkeleton } from '../components/Skeletons';

interface HomePageProps {
  onOpenDetails: (show: CatalogShow) => void;
  onPlayTrailer: (show: CatalogShow) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenDetails, onPlayTrailer }) => {
  const { data: catalog, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => catalogApi.getCatalog(),
  });

  if (isLoading) {
    return (
      <div>
        <HeroSkeleton />
        <div className="-mt-12 space-y-4 relative z-20 pb-16">
          <SectionRowSkeleton />
          <SectionRowSkeleton />
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="cinema-glass rounded-2xl p-8 max-w-lg space-y-4 border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto">
            <Tv className="w-6 h-6" />
          </div>
          <h2 className="font-heading font-bold text-xl text-white">Catalogue Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {(error as any)?.message ||
              'The published catalogue file is not found. Please log in to the CMS console and trigger a publish run.'}
          </p>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              Open CMS Console
            </a>
          </div>
        </div>
      </div>
    );
  }

  const featured = catalog.featured || catalog.all_shows[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Featured Hero */}
      {featured && (
        <HeroBanner
          show={featured}
          onOpenDetails={onOpenDetails}
          onPlayTrailer={onPlayTrailer}
        />
      )}

      {/* Sections Rows Shelf */}
      <div className="-mt-14 relative z-20 space-y-6">
        {Object.entries(catalog.sections).map(([sectionTitle, shows]) => (
          <SectionRow
            key={sectionTitle}
            sectionTitle={sectionTitle}
            shows={shows}
            onOpenDetails={onOpenDetails}
            onPlayTrailer={onPlayTrailer}
          />
        ))}
      </div>
    </div>
  );
};
