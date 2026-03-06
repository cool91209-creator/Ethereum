import type { ApiError, ApiResponse } from '@/types';

/**
 * Central API client.
 *
 * BACKEND INTEGRATION:
 * 1. Set NEXT_PUBLIC_API_BASE_URL in .env to your real backend
 * 2. Set NEXT_PUBLIC_USE_MOCKS=false
 * 3. The client will automatically route through Next.js proxy rewrites
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

function getApiUrl(path: string): string {
  // In mock mode, call local API routes directly
  if (USE_MOCKS) {
    return `${BASE_URL}${path}`;
  }
  // In production, route through the proxy rewrite
  return `${BASE_URL}/api/proxy${path.replace('/api', '')}`;
}

class ApiClientError extends Error implements ApiError {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return { code: error.code, message: error.message, status: error.status, details: error.details };
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return { code: 'TIMEOUT', message: 'Request timed out', status: 408 };
    }
    return { code: 'NETWORK_ERROR', message: error.message, status: 0 };
  }
  return { code: 'UNKNOWN', message: 'An unknown error occurred', status: 500 };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const url = getApiUrl(path);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiClientError({
        code: body.code || 'API_ERROR',
        message: body.message || `HTTP ${response.status}`,
        status: response.status,
        details: body.details,
      });
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    clearTimeout(timeoutId);
    const normalized = normalizeError(error);
    return { success: false, data: undefined as unknown as T, error: normalized };
  }
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    const fullPath = query ? `${path}?${query}` : path;
    return request<T>(fullPath);
  },

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
