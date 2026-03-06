'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MetricsBucket, PaginationMeta, ApiError } from '@/types';

interface UseMetricsState {
  buckets: MetricsBucket[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: ApiError | null;
}

export function useMetrics(from?: string, to?: string) {
  const [state, setState] = useState<UseMetricsState>({
    buckets: [],
    pagination: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/metrics?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setState({
        buckets: data.data,
        pagination: data.pagination,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: {
          code: 'FETCH_ERROR',
          message: err instanceof Error ? err.message : 'Failed to fetch metrics',
          status: 0,
        },
      }));
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, retry };
}
