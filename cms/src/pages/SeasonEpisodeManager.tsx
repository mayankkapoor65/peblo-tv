import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Tv,
  Film,
  Layers,
  Trash2,
  Edit,
  Clock,
  Globe,
  Sparkles,
  AlertCircle,
  Video,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { Show, Season, Episode, Artwork } from '../types';
import { ArtworkUploader } from '../components/ArtworkUploader';

interface SeasonEpisodeManagerProps {
  showId: string;
  onBack: () => void;
}

const COMMON_LANGUAGES = [
  { code: 'en', label: 'English (en)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'hi', label: 'Hindi (hi)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'ko', label: 'Korean (ko)' },
  { code: 'zh', label: 'Chinese (zh)' },
];

export const SeasonEpisodeManager: React.FC<SeasonEpisodeManagerProps> = ({ showId, onBack }) => {
  const queryClient = useQueryClient();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  // Modal States
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [seasonNumberInput, setSeasonNumberInput] = useState<number>(1);
  const [seasonTitleInput, setSeasonTitleInput] = useState<string>('');

  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [epNumber, setEpNumber] = useState(1);
  const [epContentGroup, setEpContentGroup] = useState('');
  const [epLanguage, setEpLanguage] = useState('en');
  const [epTitle, setEpTitle] = useState('');
  const [epSynopsis, setEpSynopsis] = useState('');
  const [epDurationMinutes, setEpDurationMinutes] = useState(45);
  const [epStreamUrl, setEpStreamUrl] = useState('');
  const [epThumbnail, setEpThumbnail] = useState<Artwork | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch complete show hierarchy
  const { data: show, isLoading, error } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => api.getShow(showId),
  });

  // Set default active season once loaded
  const seasons = show?.seasons || [];
  const selectedSeason = seasons.find((s) => s.id === activeSeasonId) || seasons[0] || null;

  // Add Season Mutation
  const createSeasonMutation = useMutation({
    mutationFn: () =>
      api.createSeason(showId, {
        season_number: Number(seasonNumberInput),
        title: seasonTitleInput || (seasonNumberInput === 0 ? 'Trailers & Extras' : `Season ${seasonNumberInput}`),
      }),
    onSuccess: (newSeason) => {
      queryClient.invalidateQueries({ queryKey: ['show', showId] });
      setIsSeasonModalOpen(false);
      setActiveSeasonId(newSeason.id);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to create season');
    },
  });

  // Delete Season Mutation
  const deleteSeasonMutation = useMutation({
    mutationFn: (sId: string) => api.deleteSeason(sId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show', showId] });
      setActiveSeasonId(null);
    },
  });

  // Save Episode Mutation
  const saveEpisodeMutation = useMutation({
    mutationFn: () => {
      if (!selectedSeason) throw new Error('No active season selected');
      setModalError(null);
      const payload: Partial<Episode> = {
        episode_number: Number(epNumber),
        content_group_id: epContentGroup.trim(),
        language: epLanguage.trim().toLowerCase(),
        title: epTitle.trim(),
        synopsis: epSynopsis.trim(),
        duration_seconds: Math.round(epDurationMinutes * 60),
        thumbnail_id: epThumbnail?.id || null,
        stream_url: epStreamUrl.trim() || null,
      };

      if (editingEpisode) {
        return api.updateEpisode(editingEpisode.id, payload);
      } else {
        return api.createEpisode(selectedSeason.id, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show', showId] });
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
      setIsEpisodeModalOpen(false);
      setEditingEpisode(null);
    },
    onError: (err: any) => {
      setModalError(err.message || 'Failed to save episode');
    },
  });

  // Delete Episode Mutation
  const deleteEpisodeMutation = useMutation({
    mutationFn: (epId: string) => api.deleteEpisode(epId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show', showId] });
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
    },
  });

  const openNewEpisodeModal = (defaultCg?: string, defaultNumber?: number) => {
    setModalError(null);
    setEditingEpisode(null);
    setEpNumber(defaultNumber || (selectedSeason?.episodes?.length ? selectedSeason.episodes.length + 1 : 1));
    setEpContentGroup(
      defaultCg || `cg-${show?.slug || 'show'}-s0${selectedSeason?.season_number || 1}e0${epNumber}`
    );
    setEpLanguage('en');
    setEpTitle('');
    setEpSynopsis('');
    setEpDurationMinutes(45);
    setEpStreamUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    setEpThumbnail(null);
    setIsEpisodeModalOpen(true);
  };

  const openEditEpisodeModal = (ep: Episode) => {
    setModalError(null);
    setEditingEpisode(ep);
    setEpNumber(ep.episode_number);
    setEpContentGroup(ep.content_group_id);
    setEpLanguage(ep.language);
    setEpTitle(ep.title);
    setEpSynopsis(ep.synopsis || '');
    setEpDurationMinutes(Math.round((ep.duration_seconds || 0) / 60));
    setEpStreamUrl(ep.stream_url || '');
    setEpThumbnail(ep.thumbnail || null);
    setIsEpisodeModalOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading seasons & episodes...</p>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="glass-panel rounded-2xl p-8 border-rose-500/40 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-rose-300">Show not found</h3>
        <button onClick={onBack} className="mt-4 px-4 py-1.5 text-xs bg-slate-800 rounded-lg text-white">
          Back
        </button>
      </div>
    );
  }

  // Group episodes in selected season by content_group_id
  const groupedEpisodes: Record<string, Episode[]> = {};
  if (selectedSeason?.episodes) {
    for (const ep of selectedSeason.episodes) {
      if (!groupedEpisodes[ep.content_group_id]) {
        groupedEpisodes[ep.content_group_id] = [];
      }
      groupedEpisodes[ep.content_group_id].push(ep);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shows</span>
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white font-heading">{show.title}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {show.category}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setSeasonNumberInput(seasons.length > 0 ? Math.max(...seasons.map((s) => s.season_number)) + 1 : 1);
            setSeasonTitleInput('');
            setIsSeasonModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Season</span>
        </button>
      </div>

      {/* Season Selection Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800">
        {seasons.map((season) => {
          const isSeason0 = season.season_number === 0;
          const isSelected = (selectedSeason?.id || seasons[0]?.id) === season.id;
          return (
            <button
              key={season.id}
              onClick={() => setActiveSeasonId(season.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center space-x-2 transition ${
                isSelected
                  ? isSeason0
                    ? 'bg-gradient-to-r from-cyan-950 to-slate-900 text-cyan-300 border border-cyan-700/60 shadow-md'
                    : 'bg-slate-800 text-white border border-slate-600 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {isSeason0 ? (
                <>
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>Season 0: Trailers & Extras</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>{season.title || `Season ${season.season_number}`}</span>
                </>
              )}
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-900/60 text-slate-400">
                {season.episodes?.length || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Season Content Area */}
      {selectedSeason ? (
        <div className="space-y-5">
          {/* Season Details & Actions */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-white">
                  {selectedSeason.season_number === 0
                    ? 'Season 0 — Promotional Trailers & Bonus Material'
                    : selectedSeason.title || `Season ${selectedSeason.season_number}`}
                </h3>
                {selectedSeason.season_number === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Excluded from Normal Season List
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedSeason.season_number === 0
                  ? 'Trailers will be placed in the hero trailer modal on the show viewer page.'
                  : 'Multi-language variants sharing the same Content Group ID will automatically collapse into a single catalogue entry.'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => openNewEpisodeModal()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-xs shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{selectedSeason.season_number === 0 ? 'Add Trailer Clip' : 'Add Episode'}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`Delete this season and all its episodes?`)) {
                    deleteSeasonMutation.mutate(selectedSeason.id);
                  }
                }}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-800 transition"
                title="Delete Season"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Episode Content Groups List */}
          {Object.keys(groupedEpisodes).length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto text-slate-600">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white">No episodes in this season</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add an episode or promotional clip to make this season ready for catalogue publication.
              </p>
              <button
                onClick={() => openNewEpisodeModal()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-xs shadow-md"
              >
                Add First Episode
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEpisodes).map(([contentGroupId, variants]) => {
                const canonical = variants[0];
                return (
                  <div
                    key={contentGroupId}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4"
                  >
                    {/* Content Group Header Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center space-x-3">
                        <span className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20">
                          E{canonical.episode_number}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-heading font-bold text-white text-base">{canonical.title}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              group: {contentGroupId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Collapses into <strong>1 catalogue item</strong> with {variants.length} language variant(s)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openNewEpisodeModal(contentGroupId, canonical.episode_number)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-400" />
                        <span>Add Language Variant</span>
                      </button>
                    </div>

                    {/* Language Variants Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition"
                        >
                          {/* Thumbnail preview */}
                          <div className="w-24 aspect-[16/9] bg-slate-950 rounded-lg overflow-hidden shrink-0 relative border border-slate-800">
                            {variant.thumbnail?.url ? (
                              <img
                                src={variant.thumbnail.url}
                                alt={variant.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-rose-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 mb-0.5" />
                                No thumb
                              </div>
                            )}
                          </div>

                          {/* Variant Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                                {variant.language}
                              </span>
                              <h5 className="text-xs font-bold text-white truncate">{variant.title}</h5>
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {variant.synopsis || 'No synopsis'}
                            </p>

                            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className={variant.duration_seconds > 0 ? 'text-slate-300' : 'text-rose-400 font-semibold'}>
                                  {variant.duration_seconds > 0 ? formatDuration(variant.duration_seconds) : 'Missing duration'}
                                </span>
                              </span>
                              {variant.stream_url && (
                                <span className="text-emerald-400 flex items-center space-x-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Stream</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditEpisodeModal(variant)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete language variant "${variant.language}" for "${variant.title}"?`)) {
                                  deleteEpisodeMutation.mutate(variant.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
          No seasons yet. Click "Add Season" above to create your first season.
        </div>
      )}

      {/* Season Modal */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Season</h3>
              <button
                onClick={() => setIsSeasonModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 rounded-lg p-2.5">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Season Number</label>
                <input
                  type="number"
                  value={seasonNumberInput}
                  onChange={(e) => setSeasonNumberInput(Number(e.target.value))}
                  min={0}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Note: <strong>Season 0</strong> is reserved for trailers/specials. 1..N for regular seasons.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Season Title</label>
                <input
                  type="text"
                  value={seasonTitleInput}
                  onChange={(e) => setSeasonTitleInput(e.target.value)}
                  placeholder={seasonNumberInput === 0 ? 'Trailers & Extras' : `Season ${seasonNumberInput}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSeasonModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createSeasonMutation.mutate()}
                disabled={createSeasonMutation.isPending}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
              >
                {createSeasonMutation.isPending ? 'Creating...' : 'Create Season'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Modal with Thumbnail Slot & Language Selector */}
      {isEpisodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-2xl p-6 max-w-2xl w-full space-y-5 border border-slate-700 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingEpisode ? `Edit Episode: ${editingEpisode.title}` : 'Add Episode / Variant'}
              </h3>
              <button
                onClick={() => setIsEpisodeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 rounded-lg p-2.5">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Episode Number *</label>
                <input
                  type="number"
                  min={1}
                  value={epNumber}
                  onChange={(e) => setEpNumber(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Language Code * <span className="text-slate-400 font-normal">(Unique per content group)</span>
                </label>
                <select
                  value={epLanguage}
                  onChange={(e) => setEpLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {COMMON_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content Group ID * <span className="text-slate-400 font-normal">(Episodes with this ID collapse together)</span>
                </label>
                <input
                  type="text"
                  value={epContentGroup}
                  onChange={(e) => setEpContentGroup(e.target.value)}
                  placeholder="e.g. cg-neon-s01e01"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Episode Title *</label>
                <input
                  type="text"
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder="e.g. Signal Breach"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Duration (Minutes) * <span className="text-brand-400">(Must be &gt;0 to publish)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={epDurationMinutes}
                  onChange={(e) => setEpDurationMinutes(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video Stream URL</label>
                <input
                  type="url"
                  value={epStreamUrl}
                  onChange={(e) => setEpStreamUrl(e.target.value)}
                  placeholder="https://.../stream.mp4 or .m3u8"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Synopsis</label>
                <textarea
                  rows={2}
                  value={epSynopsis}
                  onChange={(e) => setEpSynopsis(e.target.value)}
                  placeholder="Brief summary of this episode..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Thumbnail Upload Slot (16:9, ~640x360, <=200KB) */}
            <div className="border-t border-slate-800 pt-4">
              <ArtworkUploader
                artworkType="thumbnail"
                label="Episode Thumbnail Artwork"
                recommendedDimensions="640 x 360 px"
                aspectRatioLabel="16:9 Landscape"
                currentArtwork={epThumbnail}
                onArtworkUploaded={(art) => setEpThumbnail(art)}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsEpisodeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => saveEpisodeMutation.mutate()}
                disabled={saveEpisodeMutation.isPending}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50"
              >
                {saveEpisodeMutation.isPending ? 'Saving...' : editingEpisode ? 'Update Episode' : 'Save Episode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
