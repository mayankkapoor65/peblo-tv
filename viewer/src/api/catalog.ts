import { CatalogPayload, SearchResponse } from '../types';

const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const getFullMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const catalogApi = {
  /**
   * Fetches the pre-published atomic catalogue JSON.
   * Ultra-fast, cached with ETag, zero DB hits.
   */
  async getCatalog(): Promise<CatalogPayload> {
    const res = await fetch(`${BASE_URL}/catalog`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Catalogue has not been published yet. Please publish from the CMS Admin portal.');
      }
      throw new Error(`Failed to load catalogue (${res.status})`);
    }
    return res.json();
  },

  /**
   * Composite SQL-level search endpoint.
   * Matches show title, episode title, category, language, and section.
   */
  async searchCatalog(params: {
    q?: string;
    category?: string;
    language?: string;
    section?: string;
  }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.language) searchParams.set('language', params.language);
    if (params.section) searchParams.set('section', params.section);

    const res = await fetch(`${BASE_URL}/catalog/search?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Search failed (${res.status})`);
    }
    return res.json();
  },
};

