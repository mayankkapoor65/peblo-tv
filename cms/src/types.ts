export interface Artwork {
  id: string;
  artwork_type: 'poster' | 'banner' | 'thumbnail';
  storage_path: string;
  url: string;
  width: number;
  height: number;
  aspect_ratio: number;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  content_group_id: string;
  language: string;
  title: string;
  synopsis: string;
  duration_seconds: number;
  thumbnail_id: string | null;
  thumbnail?: Artwork | null;
  stream_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Season {
  id: string;
  show_id: string;
  season_number: number;
  title: string;
  synopsis: string;
  sort_order: number;
  created_at: string;
  episodes: Episode[];
}

export interface Show {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  category: string;
  section: string | null;
  status: 'draft' | 'published' | 'archived';
  poster_id: string | null;
  banner_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  poster?: Artwork | null;
  banner?: Artwork | null;
  seasons?: Season[];
}

export interface ValidationIssue {
  issue_type: string;
  severity: string;
  show_id?: string;
  show_title?: string;
  season_id?: string;
  season_number?: number;
  episode_id?: string;
  episode_number?: number;
  content_group_id?: string;
  message: string;
}

export interface ValidationSummary {
  total_shows: number;
  ready_shows: number;
  blocked_shows: number;
  total_issues: number;
}

export interface ValidationReport {
  can_publish: boolean;
  summary: ValidationSummary;
  issues_by_category: Record<string, ValidationIssue[]>;
  all_issues: ValidationIssue[];
}

export interface PublishRun {
  id: string;
  published_by: string;
  started_at: string;
  completed_at: string | null;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  show_count: number;
  episode_count: number;
  error_message?: string | null;
  file_hash?: string | null;
  file_size_bytes?: number | null;
  target_path?: string | null;
}

export interface PublishTriggerResponse {
  success: boolean;
  message: string;
  run_id: string;
  file_path: string;
  file_url: string;
  file_hash: string;
  file_size_bytes: number;
  show_count: number;
  episode_count: number;
  duration_ms: number;
}
