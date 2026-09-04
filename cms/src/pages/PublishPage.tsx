import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  RefreshCw,
  ChevronRight,
  Tv,
} from 'lucide-react';
import { api, getActiveRole } from '../api/client';

interface PublishPageProps {
  onNavigateToShow: (showId: string) => void;
}

const ISSUE_TYPE_DESCRIPTIONS: Record<string, { title: string; hint: string }> = {
  MISSING_SHOW_SECTION: {
    title: 'Missing Section Assignment',
    hint: 'Shows must be placed in a curated section (e.g. Trending Now) for catalogue display.',
  },
  MISSING_SHOW_POSTER: {
    title: 'Missing 2:3 Vertical Poster Artwork',
    hint: 'A 2:3 portrait poster (~600x900 px, max 200 KB) is required for section rows.',
  },
  MISSING_SHOW_BANNER: {
    title: 'Missing 16:9 Hero Banner Artwork',
    hint: 'A 16:9 landscape banner (~1280x720 px, max 200 KB) is required for the featured hero.',
  },
  EMPTY_SHOW_NO_SEASONS: {
    title: 'Show Has No Regular Seasons',
    hint: 'Shows must have at least one numbered season (Season 1, 2, ...) with playable content.',
  },
  EMPTY_SEASON_NO_EPISODES: {
    title: 'Season Has No Episodes',
    hint: 'Each season must have at least one episode before publishing.',
  },
  MISSING_EPISODE_ARTWORK: {
    title: 'Missing Episode Thumbnail Artwork',
    hint: 'Episodes must have a 16:9 thumbnail (~640x360 px, max 200 KB).',
  },
  MISSING_EPISODE_DURATION: {
    title: 'Missing Playback Duration',
    hint: 'Episodes must have a duration greater than 0 seconds.',
  },
  DUPLICATE_LANGUAGE_VARIANT: {
    title: 'Duplicate Language Variant',
    hint: 'A content group cannot have duplicate episodes in the same language.',
  },
};

export const PublishPage: React.FC<PublishPageProps> = ({ onNavigateToShow }) => {
  const queryClient = useQueryClient();
  const role = getActiveRole();
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [publishErrorMsg, setPublishErrorMsg] = useState<string | null>(null);

  // Fetch validation report
  const {
    data: report,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['validation-report'],
    queryFn: () => api.getValidationReport(),
  });

  // Fetch publish runs history
  const {
    data: runs,
    isLoading: isRunsLoading,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['publish-runs'],
    queryFn: () => api.getPublishRuns(),
  });

  // Trigger publish mutation
  const publishMutation = useMutation({
    mutationFn: (force?: boolean) => api.publishCatalog(Boolean(force)),
    onSuccess: (data) => {
      setPublishSuccessMsg(
        `Catalogue published successfully! (${data.show_count} shows, ${data.episode_count} episodes in ${data.duration_ms}ms)`
      );
      setPublishErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
      queryClient.invalidateQueries({ queryKey: ['publish-runs'] });
    },
    onError: (err: any) => {
      setPublishErrorMsg(err.message || 'Catalogue publish failed');
      setPublishSuccessMsg(null);
    },
  });

  const canPublish = report?.can_publish ?? false;
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Catalogue Publishing Console</h1>
          <p className="text-sm text-slate-400">
            Real-time pre-flight validation checks, atomic JSON compilation, and publish audit runs.
          </p>
        </div>

        <button
          onClick={() => {
            refetchReport();
            refetchRuns();
          }}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-850 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Publishing Trigger Control Banner */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800/80 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                canPublish
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {canPublish ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                {canPublish ? 'All Systems Ready to Publish' : 'Publishing Blocked by Diagnostics'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {canPublish
                  ? 'Catalogue data and artwork constraints are 100% satisfied.'
                  : `${report?.summary.total_issues || 0} blocking issue(s) detected. Fix below to enable production catalogue generation.`}
              </p>
            </div>
          </div>

          {/* Publish Trigger Button with RBAC & Blocker Tooltip */}
          <div className="flex flex-col items-end space-y-1.5 w-full md:w-auto">
            <button
              onClick={() => publishMutation.mutate(false)}
              disabled={!canPublish || !isAdmin || publishMutation.isPending}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition ${
                canPublish && isAdmin
                  ? 'bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 shadow-brand-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-75'
              }`}
            >
              {publishMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Atomic Catalogue...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 stroke-[2.5]" />
                  <span>Publish Catalogue to Storage</span>
                </>
              )}
            </button>

            {!isAdmin && (
              <span className="text-[11px] text-amber-400 flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Editor role cannot publish. Switch role to Admin in top header.</span>
              </span>
            )}
          </div>
        </div>

        {/* Notifications */}
        {publishSuccessMsg && (
          <div className="flex items-center space-x-3 text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{publishSuccessMsg}</span>
          </div>
        )}

        {publishErrorMsg && (
          <div className="flex items-center space-x-3 text-sm text-rose-300 bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 animate-fadeIn">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{publishErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Total Shows</span>
            <div className="text-2xl font-bold text-white mt-1">{report.summary.total_shows}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <span className="text-xs text-emerald-400 font-medium">Ready to Publish</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{report.summary.ready_shows}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <span className="text-xs text-amber-400 font-medium">Blocked Shows</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{report.summary.blocked_shows}</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <span className="text-xs text-rose-400 font-medium">Total Issues</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{report.summary.total_issues}</div>
          </div>
        </div>
      )}

      {/* Validation Report Details (Self-Service Fixes) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-heading flex items-center space-x-2">
          <span>Self-Serve Diagnostic Report</span>
          {report && (
            <span className="text-xs font-normal text-slate-400">
              ({report.summary.total_issues} issue{report.summary.total_issues === 1 ? '' : 's'})
            </span>
          )}
        </h3>

        {isReportLoading ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Running validation diagnostics...</span>
          </div>
        ) : !report || Object.keys(report.issues_by_category).length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 border-emerald-500/30 bg-emerald-950/10 flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-300">No Blocker Issues Detected</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                All shows have designated sections, valid poster & banner artworks, seasons, thumbnails, and durations.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(report.issues_by_category).map(([catKey, issues]) => {
              const meta = ISSUE_TYPE_DESCRIPTIONS[catKey] || {
                title: catKey.replace(/_/g, ' '),
                hint: 'Please review and correct this issue.',
              };
              return (
                <div key={catKey} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <h4 className="font-heading font-bold text-white text-base">{meta.title}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800">
                          {issues.length} item{issues.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{meta.hint}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                            <Tv className="w-3.5 h-3.5 text-slate-400" />
                            <span>{issue.show_title || 'Unknown Show'}</span>
                            {issue.season_number !== undefined && (
                              <span className="text-slate-400">
                                • {issue.season_number === 0 ? 'Trailers' : `Season ${issue.season_number}`}
                              </span>
                            )}
                            {issue.episode_number !== undefined && (
                              <span className="text-slate-400">• Ep {issue.episode_number}</span>
                            )}
                          </div>
                          <p className="text-rose-400/90 leading-relaxed">{issue.message}</p>
                        </div>

                        {issue.show_id && (
                          <button
                            onClick={() => onNavigateToShow(issue.show_id!)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold shrink-0 transition"
                          >
                            <span>Fix in Editor</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish Run History Audit Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-heading">Publish Run Audit History</h3>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Published By</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Shows / Episodes</th>
                  <th className="px-4 py-3">File SHA-256</th>
                  <th className="px-4 py-3">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isRunsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Loading publish audit history...
                    </td>
                  </tr>
                ) : !runs || runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No publish runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            run.status === 'success'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : run.status === 'failed'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse'
                          }`}
                        >
                          <span>{run.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-300">{run.published_by}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {run.completed_at
                          ? new Date(run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {run.show_count} shows • {run.episode_count} eps
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {run.file_hash ? `${run.file_hash.substring(0, 12)}...` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {run.file_size_bytes ? `${(run.file_size_bytes / 1024).toFixed(1)} KB` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
