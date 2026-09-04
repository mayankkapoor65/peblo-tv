import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Filter,
  Layers,
  Edit,
  Trash2,
  Tv,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api, getActiveRole } from '../api/client';
import { Show } from '../types';

interface ShowsListPageProps {
  onEditShow: (showId: string) => void;
  onCreateShow: () => void;
  onManageEpisodes: (showId: string) => void;
}

const SECTIONS = ['All Sections', 'Trending Now', 'Critically Acclaimed Dramas', 'New Releases', 'Sci-Fi & Cyberpunk Hits'];
const STATUSES = ['All Statuses', 'published', 'draft', 'archived'];

export const ShowsListPage: React.FC<ShowsListPageProps> = ({
  onEditShow,
  onCreateShow,
  onManageEpisodes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const queryClient = useQueryClient();

  const role = getActiveRole();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shows', searchTerm, selectedSection, selectedStatus, page],
    queryFn: () =>
      api.getShows({
        q: searchTerm || undefined,
        section: selectedSection !== 'All Sections' ? selectedSection : undefined,
        status: selectedStatus !== 'All Statuses' ? selectedStatus : undefined,
        page,
        page_size: pageSize,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
    onError: (err: any) => {
      alert(`Could not delete show: ${err.message}`);
    },
  });

  const handleDelete = (show: Show) => {
    if (confirm(`Are you sure you want to delete "${show.title}" and all its seasons/episodes?`)) {
      deleteMutation.mutate(show.id);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Catalogue Management</h1>
          <p className="text-sm text-slate-400">
            Create, edit, and curate TV shows, multi-language episode variants, and promotional trailers.
          </p>
        </div>

        <button
          onClick={onCreateShow}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition duration-150"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Show</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search shows by title, category, synopsis..."
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        {/* Section Filter */}
        <div className="flex items-center space-x-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st === 'All Statuses' ? 'All Statuses' : st.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading shows catalogue...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="glass-panel rounded-2xl p-8 border-rose-500/40 bg-rose-950/20 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-rose-300">Failed to load shows</h3>
          <p className="text-xs text-rose-400 mt-1">{(error as any).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 text-xs font-semibold bg-rose-900/50 hover:bg-rose-800 text-white rounded-lg border border-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="glass-panel rounded-2xl p-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No shows found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
              {searchTerm || selectedSection !== 'All Sections'
                ? 'Try adjusting your search terms or filters.'
                : 'Get started by creating your first show in the catalogue.'}
            </p>
          </div>
          <button
            onClick={onCreateShow}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-950 font-bold text-sm shadow-md"
          >
            Create Show
          </button>
        </div>
      )}

      {/* Shows Grid */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.items.map((show) => (
            <div
              key={show.id}
              className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Poster Artwork Box */}
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  {show.banner?.url || show.poster?.url ? (
                    <img
                      src={show.banner?.url || show.poster?.url}
                      alt={show.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-1">
                      <Tv className="w-8 h-8" />
                      <span className="text-[11px] text-slate-500">No artwork</span>
                    </div>
                  )}

                  {/* Badges on artwork */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md shadow-sm ${
                        show.status === 'published'
                          ? 'bg-emerald-500/80 text-slate-950 border border-emerald-400'
                          : show.status === 'draft'
                          ? 'bg-amber-500/80 text-slate-950 border border-amber-400'
                          : 'bg-slate-700/80 text-white'
                      }`}
                    >
                      {show.status}
                    </span>

                    {show.section ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-200 backdrop-blur-md border border-slate-700/80">
                        {show.section}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 backdrop-blur-md border border-rose-700/80">
                        No Section
                      </span>
                    )}
                  </div>
                </div>

                {/* Show Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-bold text-base text-white line-clamp-1 group-hover:text-brand-400 transition-colors">
                      {show.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {show.synopsis || 'No synopsis provided.'}
                  </p>

                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      {show.category}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Slug: <code className="text-slate-400">{show.slug}</code>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                <button
                  onClick={() => onManageEpisodes(show.id)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700/60"
                  title="Manage Seasons, Episodes & Language Variants"
                >
                  <Layers className="w-3.5 h-3.5 text-brand-400" />
                  <span>Episodes</span>
                </button>

                <button
                  onClick={() => onEditShow(show.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition border border-slate-700/60"
                  title="Edit Show Details & Artwork"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(show)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition border border-slate-700/60"
                  title="Delete Show"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && data && data.total > pageSize && (
        <div className="flex items-center justify-between glass-panel rounded-xl px-5 py-3 text-xs text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of{' '}
            <strong className="text-white">{data.total}</strong> shows
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
