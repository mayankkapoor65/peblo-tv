import React, { useState } from 'react';
import { X, Play, Clock, Globe, Film, Layers, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { CatalogShow, CatalogEpisodeCollapsed, EpisodeVariant } from '../types';

interface ShowDetailPageProps {
  show: CatalogShow;
  onClose: () => void;
  onPlayTrailer: (show: CatalogShow) => void;
}

export const ShowDetailPage: React.FC<ShowDetailPageProps> = ({ show, onClose, onPlayTrailer }) => {
  const seasons = show.seasons || [];
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    seasons[0]?.season_number || 1
  );

  // Track active language selection per episode content group
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({});
  
  // Track currently playing video stream
  const [activeVideoStream, setActiveVideoStream] = useState<{ title: string; url: string } | null>(null);

  const activeSeason = seasons.find((s) => s.season_number === selectedSeasonNumber) || seasons[0] || null;

  const handleLanguageChange = (contentGroupId: string, lang: string) => {
    setSelectedLanguages((prev) => ({
      ...prev,
      [contentGroupId]: lang,
    }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const getActiveVariant = (episode: CatalogEpisodeCollapsed): EpisodeVariant | null => {
    const currentLang = selectedLanguages[episode.content_group_id] || episode.languages[0] || 'en';
    const variant = episode.variants?.find((v) => v.language === currentLang);
    return variant || episode.variants?.[0] || null;
  };

  const playEpisode = (episode: CatalogEpisodeCollapsed) => {
    const variant = getActiveVariant(episode);
    const streamUrl =
      variant?.stream_url ||
      episode.audio_streams[selectedLanguages[episode.content_group_id] || episode.languages[0]] ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    setActiveVideoStream({
      title: `${show.title} - S${activeSeason?.season_number || 1}E${episode.episode_number}: ${variant?.title || episode.title}`,
      url: streamUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto flex items-start justify-center p-0 sm:p-6 md:p-10 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-cinema-900 border border-slate-800 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl my-0 sm:my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Player overlay if stream active */}
        {activeVideoStream && (
          <div className="relative aspect-video bg-black flex flex-col border-b border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-cinema-950 text-xs text-white">
              <span className="font-semibold truncate">{activeVideoStream.title}</span>
              <button
                onClick={() => setActiveVideoStream(null)}
                className="text-slate-400 hover:text-white"
              >
                Close Player ✕
              </button>
            </div>
            <video
              src={activeVideoStream.url}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Hero Backdrop (if video player not active) */}
        {!activeVideoStream && (
          <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full bg-cinema-950 overflow-hidden">
            {show.banner_url ? (
              <img
                src={show.banner_url}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-cinema-950 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-900 via-cinema-900/40 to-transparent" />

            <div className="absolute bottom-6 left-6 sm:left-10 max-w-xl space-y-2.5 z-10">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand-500 text-white shadow-lg red-glow">
                {show.category}
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-white drop-shadow-xl">
                {show.title}
              </h2>

              <div className="flex items-center space-x-3 pt-1">
                {show.trailers.length > 0 && (
                  <button
                    onClick={() => onPlayTrailer(show)}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs shadow-lg transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Trailer</span>
                  </button>
                )}
                <span className="text-xs text-slate-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  {show.section}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Details Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Synopsis */}
          <div className="space-y-2">
            <h3 className="font-heading font-bold text-lg text-white">About the Show</h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {show.synopsis}
            </p>
          </div>

          {/* Dedicated Season 0 Trailers & Extras section */}
          {show.trailers && show.trailers.length > 0 && (
            <div className="space-y-3 p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-heading font-bold text-white text-sm">
                    Season 0: Promotional Trailers & Bonus Material
                  </h4>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Extras
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {show.trailers.map((trailer) => (
                  <div
                    key={trailer.id}
                    onClick={() => onPlayTrailer(show)}
                    className="group flex items-center space-x-3 p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 cursor-pointer transition"
                  >
                    <div className="w-20 aspect-[16/9] bg-slate-900 rounded-lg overflow-hidden shrink-0 relative">
                      {trailer.thumbnail_url ? (
                        <img
                          src={trailer.thumbnail_url}
                          alt={trailer.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-4 h-4" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-brand-400">
                        {trailer.title}
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        Trailer • {trailer.duration_seconds}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Seasons & Collapsed Multi-Language Episodes */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-lg text-white">Episodes</h3>

              {/* Season Selection Pills */}
              {seasons.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      onClick={() => setSelectedSeasonNumber(s.season_number)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                        selectedSeasonNumber === s.season_number
                          ? 'bg-white text-slate-950 shadow-md font-bold'
                          : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {s.title || `Season ${s.season_number}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode List */}
            {activeSeason && activeSeason.episodes.length > 0 ? (
              <div className="space-y-4">
                {activeSeason.episodes.map((ep) => {
                  const activeVariant = getActiveVariant(ep);
                  const currentLang = selectedLanguages[ep.content_group_id] || ep.languages[0] || 'en';

                  return (
                    <div
                      key={ep.content_group_id}
                      className="group p-4 rounded-2xl bg-cinema-850 hover:bg-slate-850 border border-slate-800/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Thumbnail & Episode Number */}
                      <div className="flex items-start sm:items-center space-x-4">
                        {/* 16:9 Thumbnail Artwork */}
                        <div
                          onClick={() => playEpisode(ep)}
                          className="w-32 sm:w-44 aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 shrink-0 relative cursor-pointer group/thumb border border-slate-800"
                        >
                          {ep.thumbnail_url ? (
                            <img
                              src={ep.thumbnail_url}
                              alt={activeVariant?.title || ep.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-lg">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Title & Synopsis */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-slate-500 font-bold">
                              {ep.episode_number}.
                            </span>
                            <h4 className="font-heading font-bold text-white text-sm sm:text-base group-hover:text-brand-400 transition-colors">
                              {activeVariant?.title || ep.title}
                            </h4>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 max-w-xl leading-relaxed">
                            {activeVariant?.synopsis || ep.synopsis}
                          </p>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                            <span className="flex items-center space-x-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(ep.duration_seconds)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Language Variants Selector */}
                      <div className="flex items-center md:flex-col items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                        {ep.languages.length > 1 && (
                          <div className="flex items-center space-x-1.5 bg-slate-900 rounded-lg p-1 border border-slate-800">
                            <Globe className="w-3 h-3 text-brand-400 ml-1.5" />
                            <span className="text-[10px] font-semibold text-slate-400">Audio:</span>
                            {ep.languages.map((lang) => (
                              <button
                                key={lang}
                                onClick={() => handleLanguageChange(ep.content_group_id, lang)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                                  currentLang === lang
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {lang}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => playEpisode(ep)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition ml-auto md:ml-0"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No episodes available in this season.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
