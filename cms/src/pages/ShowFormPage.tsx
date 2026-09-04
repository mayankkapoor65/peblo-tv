import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../api/client';
import { Show, Artwork } from '../types';
import { ArtworkUploader } from '../components/ArtworkUploader';

interface ShowFormPageProps {
  showId?: string | null;
  onBack: () => void;
  onSaved: (showId: string) => void;
}

const SECTION_OPTIONS = [
  'Trending Now',
  'Critically Acclaimed Dramas',
  'New Releases',
  'Sci-Fi & Cyberpunk Hits',
  'Action & Adventure',
  'Documentaries',
];

export const ShowFormPage: React.FC<ShowFormPageProps> = ({ showId, onBack, onSaved }) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(showId);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [category, setCategory] = useState('Sci-Fi / Drama');
  const [section, setSection] = useState('Trending Now');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [sortOrder, setSortOrder] = useState(0);

  const [posterArtwork, setPosterArtwork] = useState<Artwork | null>(null);
  const [bannerArtwork, setBannerArtwork] = useState<Artwork | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch show details if editing
  const { data: existingShow, isLoading } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => (showId ? api.getShow(showId) : null),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingShow) {
      setTitle(existingShow.title);
      setSlug(existingShow.slug);
      setSynopsis(existingShow.synopsis || '');
      setCategory(existingShow.category || 'General');
      setSection(existingShow.section || '');
      setStatus(existingShow.status || 'draft');
      setSortOrder(existingShow.sort_order || 0);
      if (existingShow.poster) setPosterArtwork(existingShow.poster);
      if (existingShow.banner) setBannerArtwork(existingShow.banner);
    }
  }, [existingShow]);

  // Auto-generate slug from title if not manually edited in create mode
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload: Partial<Show> = {
        title: title.trim(),
        slug: slug.trim(),
        synopsis: synopsis.trim(),
        category: category.trim(),
        section: section.trim() || null,
        status,
        sort_order: Number(sortOrder),
        poster_id: posterArtwork?.id || null,
        banner_id: bannerArtwork?.id || null,
      };

      if (isEditing && showId) {
        return api.updateShow(showId, payload);
      } else {
        return api.createShow(payload);
      }
    },
    onSuccess: (savedShow) => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
      onSaved(savedShow.id);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save show');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Show title is required');
      return;
    }
    if (!slug.trim()) {
      setFormError('Show slug is required');
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading show details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shows</span>
        </button>

        <h2 className="text-xl font-bold text-white font-heading">
          {isEditing ? `Edit Show: ${existingShow?.title}` : 'Create New Show'}
        </h2>
      </div>

      {formError && (
        <div className="flex items-start space-x-3 text-sm text-rose-300 bg-rose-950/40 border border-rose-800/80 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Unable to save show</h4>
            <p className="text-xs text-rose-400 mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Metadata Section */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <span>Show Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Show Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Neon Grid: Tokyo 2099"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                URL Slug <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. neon-grid-tokyo-2099"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category / Genre <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Sci-Fi / Cyberpunk"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Catalogue Section <span className="text-brand-400 text-[11px]">(Required for publish)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">-- No Section (Draft Only) --</option>
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Publish Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="published">Published (Ready for catalogue)</option>
                <option value="draft">Draft (Work in progress)</option>
                <option value="archived">Archived (Hidden)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Priority / Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Synopsis / Overview</label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Provide a compelling overview for viewers and search indexing..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Artwork Upload Slots Section */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-brand-400" />
              <span>Show Artwork Slots</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload required artworks. Strict 200 KB ceiling and aspect ratio validation are enforced.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slot 1: Poster (2:3, ~600x900) */}
            <ArtworkUploader
              artworkType="poster"
              label="Vertical Poster Artwork"
              recommendedDimensions="600 x 900 px"
              aspectRatioLabel="2:3 Portrait"
              currentArtwork={posterArtwork}
              onArtworkUploaded={(art) => setPosterArtwork(art)}
            />

            {/* Slot 2: Banner (16:9, ~1280x720) */}
            <ArtworkUploader
              artworkType="banner"
              label="Horizontal Hero Banner Artwork"
              recommendedDimensions="1280 x 720 px"
              aspectRatioLabel="16:9 Landscape"
              currentArtwork={bannerArtwork}
              onArtworkUploaded={(art) => setBannerArtwork(art)}
            />
          </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/20 disabled:opacity-50 transition"
          >
            {saveMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isEditing ? 'Save Changes' : 'Create Show'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
