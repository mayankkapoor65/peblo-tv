import React from 'react';
import { Play, Info, Globe, Film } from 'lucide-react';
import { CatalogShow } from '../types';

interface ShowCardProps {
  show: CatalogShow;
  onOpenDetails: (show: CatalogShow) => void;
  onPlayTrailer: (show: CatalogShow) => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show, onOpenDetails, onPlayTrailer }) => {
  const totalEpisodes = show.seasons.reduce((acc, s) => acc + s.episodes.length, 0);

  return (
    <div
      onClick={() => onOpenDetails(show)}
      className="group relative flex-none w-40 sm:w-48 md:w-52 aspect-[2/3] rounded-xl overflow-hidden bg-cinema-900 border border-slate-800/80 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-20 hover:border-brand-500/80 hover:shadow-2xl hover:shadow-brand-950/50"
    >
      {/* Poster Image */}
      {show.poster_url ? (
        <img
          src={show.poster_url}
          alt={show.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-900 to-cinema-950">
          <Film className="w-8 h-8 text-slate-600 mb-2" />
          <span className="font-heading font-bold text-sm text-white">{show.title}</span>
        </div>
      )}

      {/* Hover Info Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-[#05070c]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
          {show.category}
        </span>
        <h3 className="font-heading font-bold text-sm text-white leading-tight mt-0.5 line-clamp-1">
          {show.title}
        </h3>

        <div className="flex items-center space-x-2 text-[11px] text-slate-300 mt-1.5">
          <span>{show.seasons.length} Season{show.seasons.length === 1 ? '' : 's'}</span>
          <span>•</span>
          <span>{totalEpisodes} Eps</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayTrailer(show);
            }}
            className="p-2 rounded-full bg-white hover:bg-slate-200 text-slate-950 transition shadow-md"
            title="Play Trailer"
          >
            <Play className="w-3 h-3 fill-current" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(show);
            }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition border border-white/20"
            title="More Info"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
