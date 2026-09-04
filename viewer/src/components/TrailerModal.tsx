import React, { useState } from 'react';
import { X, Play, Film, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { CatalogShow, CatalogTrailer } from '../types';

interface TrailerModalProps {
  show: CatalogShow;
  initialTrailer?: CatalogTrailer | null;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ show, initialTrailer, onClose }) => {
  const trailers = show.trailers || [];
  const [activeTrailer, setActiveTrailer] = useState<CatalogTrailer>(
    initialTrailer || trailers[0] || {
      id: 'default',
      title: `${show.title} - Official Trailer`,
      synopsis: show.synopsis,
      duration_seconds: 120,
      thumbnail_url: show.banner_url || show.poster_url,
      stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      language: 'en',
    }
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-cinema-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-cinema-950/80">
          <div className="flex items-center space-x-2">
            <Film className="w-5 h-5 text-brand-500" />
            <h3 className="font-heading font-bold text-white text-base truncate">
              {show.title} — {activeTrailer.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {activeTrailer.stream_url ? (
            <video
              key={activeTrailer.id || activeTrailer.stream_url}
              src={activeTrailer.stream_url}
              poster={activeTrailer.thumbnail_url || show.banner_url || undefined}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8 space-y-2 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
              <p className="text-sm">Video stream link unavailable for this preview clip.</p>
            </div>
          )}
        </div>

        {/* Trailer Selection & Synopsis */}
        <div className="p-6 space-y-4 bg-cinema-950">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-white text-sm">{activeTrailer.title}</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {activeTrailer.synopsis || show.synopsis}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 self-start sm:self-auto border border-slate-700">
              Season 0 Promo ({activeTrailer.duration_seconds}s)
            </span>
          </div>

          {/* Multiple trailers list if available */}
          {trailers.length > 1 && (
            <div className="border-t border-slate-800/80 pt-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                More Trailers & Teasers
              </span>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {trailers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTrailer(t)}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                      activeTrailer.id === t.id
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
