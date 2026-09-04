import { Show, Season, Episode, Artwork, ValidationReport, PublishRun, PublishTriggerResponse } from '../types';

let currentRole: 'admin' | 'editor' = (localStorage.getItem('peblo_role') as 'admin' | 'editor') || 'admin';

export const getActiveRole = () => currentRole;
export const setActiveRole = (role: 'admin' | 'editor') => {
  currentRole = role;
  localStorage.setItem('peblo_role', role);
  window.dispatchEvent(new Event('peblo-role-changed'));
};

const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const getFullMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getHeaders = (isMultipart = false): HeadersInit => {
  const headers: Record<string, string> = {
    'X-User-Role': currentRole,
  };
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Request failed';
    try {
      const data = await res.json();
      if (data.detail) {
        if (typeof data.detail === 'object') {
          errorDetail = data.detail.message || JSON.stringify(data.detail);
        } else {
          errorDetail = data.detail;
        }
      } else if (data.message) {
        errorDetail = data.message;
      }
    } catch {
      errorDetail = `${res.status} ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Shows
  async getShows(params: { q?: string; section?: string; status?: string; category?: string; page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.section) searchParams.set('section', params.section);
    if (params.status) searchParams.set('status', params.status);
    if (params.category) searchParams.set('category', params.category);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());

    const res = await fetch(`${BASE_URL}/api/admin/shows?${searchParams.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<{ total: number; page: number; page_size: number; items: Show[] }>(res);
  },

  async getShow(id: string) {
    const res = await fetch(`${BASE_URL}/api/admin/shows/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<Show>(res);
  },

  async createShow(data: Partial<Show>) {
    const res = await fetch(`${BASE_URL}/api/admin/shows`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Show>(res);
  },

  async updateShow(id: string, data: Partial<Show>) {
    const res = await fetch(`${BASE_URL}/api/admin/shows/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Show>(res);
  },

  async deleteShow(id: string) {
    const res = await fetch(`${BASE_URL}/api/admin/shows/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete show');
    return true;
  },

  // Seasons
  async createSeason(showId: string, data: Partial<Season>) {
    const res = await fetch(`${BASE_URL}/api/admin/shows/${showId}/seasons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Season>(res);
  },

  async updateSeason(seasonId: string, data: Partial<Season>) {
    const res = await fetch(`${BASE_URL}/api/admin/seasons/${seasonId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Season>(res);
  },

  async deleteSeason(seasonId: string) {
    const res = await fetch(`${BASE_URL}/api/admin/seasons/${seasonId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete season');
    return true;
  },

  // Episodes
  async createEpisode(seasonId: string, data: Partial<Episode>) {
    const res = await fetch(`${BASE_URL}/api/admin/seasons/${seasonId}/episodes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Episode>(res);
  },

  async updateEpisode(episodeId: string, data: Partial<Episode>) {
    const res = await fetch(`${BASE_URL}/api/admin/episodes/${episodeId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Episode>(res);
  },

  async deleteEpisode(episodeId: string) {
    const res = await fetch(`${BASE_URL}/api/admin/episodes/${episodeId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete episode');
    return true;
  },

  // Artwork
  async uploadArtwork(file: File, artworkType: 'poster' | 'banner' | 'thumbnail') {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/admin/artwork/upload?artwork_type=${artworkType}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse<Artwork>(res);
  },

  // Validation Report
  async getValidationReport() {
    const res = await fetch(`${BASE_URL}/api/admin/validation-report`, {
      headers: getHeaders(),
    });
    return handleResponse<ValidationReport>(res);
  },

  // Publish
  async publishCatalog(force = false) {
    const res = await fetch(`${BASE_URL}/api/admin/catalog/publish?force=${force}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<PublishTriggerResponse>(res);
  },

  async getPublishRuns() {
    const res = await fetch(`${BASE_URL}/api/admin/catalog/publish/runs`, {
      headers: getHeaders(),
    });
    return handleResponse<PublishRun[]>(res);
  },
};
