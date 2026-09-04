import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Globe, Tv, Play, AlertCircle, Sparkles } from 'lucide-react';
import { catalogApi } from '../api/catalog';
import { CatalogShow, SearchResultItem } from '../types';

interface SearchPageProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenDetails: (show: CatalogShow) => void;
  onPlayTrailer: (show: CatalogShow) => void;
  allCatalogShows: CatalogShow[];
}

const POPULAR_CATEGORIES = ['All Genres', 'Sci-Fi / Cyberpunk', 'Historical Drama', 'Crime / Thriller', 'Sci-Fi / Mystery', 'Sci-Fi / Adventure'];
const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'hi', label: 'Hindi' },
];

export const SearchPage: React.FC<SearchPageProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenDetails,
  onPlayTrailer,
  allCatalogShows,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Genres');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery, selectedCategory, selectedLanguage],
    queryFn: () =>
      catalogApi.searchCatalog({
        q: searchQuery || undefined,
        category: selectedCategory !== 'All Genres' ? selectedCategory : undefined,
        language: selectedLanguage || undefined,
      }),
  });

  const handleCardClick = (item: SearchResultItem) => {
    const fullShow = allCatalogShows.find((s) => s.id === item.show_id);
    if (fullShow) {
      onOpenDetails(fullShow);
    } else {
      // Create minimal fallback
      onOpenDetails({
        id: item.show_id,
        title: item.show_title,
        slug: item.show_slug,
        synopsis: '',
        category: item.category,
        section: item.section || 'General',
        poster_url: item.poster_url,
        banner_url: item.banner_url,
        sort_order: 0,
        trailers: [],
        seasons: [],
      });
    }
  };

  return (
    <div className="pt-24 px-6 sm:px-12 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
          Search & Discover
        </h1>

        {/* Search input */}
        <div className="relative max-w-2xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, character, episode name, or genre..."
            className="w-full bg-cinema-850 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 shadow-xl"
          />
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {POPULAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-md red-glow'
                  : 'bg-cinema-850 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Language dropdown */}
          <div className="ml-auto flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-cinema-850 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Searching catalogue database...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="cinema-glass rounded-2xl p-8 border-rose-500/40 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-rose-300">Search encountered an issue</h3>
          <p className="text-xs text-rose-400 mt-1">{(error as any).message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data && data.results.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cinema-850 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No matches found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            We couldn't find any shows matching "{searchQuery}". Try searching for another title, or clear your genre filters.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && !error && data && data.results.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            Found <strong className="text-white">{data.total}</strong> matching result{data.total === 1 ? '' : 's'}:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {data.results.map((item, idx) => (
              <div
                key={`${item.show_id}-${item.matched_title}-${idx}`}
                onClick={() => handleCardClick(item)}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-cinema-900 border border-slate-800/80 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 hover:border-brand-500/80 hover:shadow-2xl"
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.show_title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-900">
                    <Tv className="w-6 h-6 text-slate-600 mb-1" />
                    <span className="text-xs font-bold text-white line-clamp-2">{item.show_title}</span>
                  </div>
                )}

                {/* Match indicator pill */}
                {item.matched_type === 'episode_title' && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-brand-500 text-white backdrop-blur-md shadow">
                      Episode Match
                    </span>
                  </div>
                )}

                {/* Hover details overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-[#05070c]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-bold uppercase text-brand-400">
                    {item.category}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-white line-clamp-1">
                    {item.show_title}
                  </h4>
                  {item.episode_title && (
                    <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                      Ep: {item.episode_title}
                    </p>
                  )}
                  {item.available_languages.length > 0 && (
                    <span className="text-[10px] text-slate-400 mt-1">
                      Audio: {item.available_languages.map((l) => l.toUpperCase()).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
