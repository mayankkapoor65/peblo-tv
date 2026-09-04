import React from 'react';
import { Play, Info, Sparkles, Film, Globe } from 'lucide-react';
import { CatalogShow } from '../types';

interface HeroBannerProps {
  show: CatalogShow;
  onPlayTrailer: (show: CatalogShow) => void;
  onOpenDetails: (show: CatalogShow) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ show, onPlayTrailer, onOpenDetails }) => {
  // Collect all distinct languages across seasons & trailers
  const languagesSet = new Set<string>();
  show.seasons.forEach((s) => s.episodes.forEach((e) => e.languages.forEach((l) => languagesSet.add(l))));
  show.trailers.forEach((t) => languagesSet.add(t.language));
  const languagesList = Array.from(languagesSet).slice(0, 4);

  return (
    <div className="relative w-full h-[75vh] min-h-[520px] max-h-[750px] overflow-hidden">
      {/* Backdrop Banner Image */}
      <div className="absolute inset-0">
        {show.banner_url ? (
          <img
            src={show.banner_url}
            alt={show.title}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-cinema-950 via-cinema-900 to-slate-900" />
        )}
      </div>

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 hero-side-vignette" />
      <div className="absolute inset-0 hero-vignette" />

      {/* Content */}
      <div className="absolute bottom-16 sm:bottom-20 left-6 sm:left-12 max-w-2xl space-y-4 z-10">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-brand-500 text-white shadow-lg red-glow">
            FEATURED
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-slate-200 border border-white/10">
            {show.category}
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-slate-200 border border-white/10">
            {show.section}
          </span>
          {languagesList.length > 0 && (
            <span className="text-[11px] text-slate-300 flex items-center space-x-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
              <Globe className="w-3 h-3 text-brand-400" />
              <span>{languagesList.map((l) => l.toUpperCase()).join(', ')}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-none drop-shadow-2xl">
          {show.title}
        </h1>

        {/* Synopsis */}
        <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed drop-shadow-md">
          {show.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 pt-2">
          <button
            onClick={() => onPlayTrailer(show)}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm shadow-xl transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Trailer</span>
          </button>

          <button
            onClick={() => onOpenDetails(show)}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm backdrop-blur-md border border-white/20 shadow-xl transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>More Info</span>
          </button>
        </div>
      </div>
    </div>
  );
};
