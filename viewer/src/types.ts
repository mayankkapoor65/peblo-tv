export interface CatalogTrailer {
  id: string;
  title: string;
  synopsis: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  stream_url: string | null;
  language: string;
}

export interface EpisodeVariant {
  id: string;
  language: string;
  title: string;
  synopsis: string;
  duration_seconds: number;
  stream_url: string | null;
}

export interface CatalogEpisodeCollapsed {
  content_group_id: string;
  episode_number: number;
  title: string;
  synopsis: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  languages: string[];
  audio_streams: Record<string, string>;
  variants: EpisodeVariant[];
}

export interface CatalogSeason {
  season_number: number;
  title: string;
  synopsis: string;
  episodes: CatalogEpisodeCollapsed[];
}

export interface CatalogShow {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  category: string;
  section: string;
  poster_url: string | null;
  banner_url: string | null;
  sort_order: number;
  trailers: CatalogTrailer[];
  seasons: CatalogSeason[];
}

export interface CatalogPayload {
  generated_at: string;
  version: string;
  total_shows: number;
  total_episodes: number;
  featured: CatalogShow | null;
  sections: Record<string, CatalogShow[]>;
  all_shows: CatalogShow[];
}

export interface SearchResultItem {
  show_id: string;
  show_title: string;
  show_slug: string;
  category: string;
  section: string | null;
  poster_url: string | null;
  banner_url: string | null;
  matched_type: string;
  matched_title: string;
  episode_title?: string | null;
  season_number?: number | null;
  episode_number?: number | null;
  available_languages: string[];
}

export interface SearchResponse {
  total: number;
  query: string;
  filters: {
    category?: string | null;
    language?: string | null;
    section?: string | null;
  };
  results: SearchResultItem[];
}
