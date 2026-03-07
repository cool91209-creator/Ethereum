'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Contract, ContractsResponse, ContractTotals, PaginationMeta, ApiError } from '@/types';
import type { ContractsQuery } from '@/lib/schemas/contracts';

interface UseContractsState {
  contracts: Contract[];
  totals: ContractTotals | null;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: ApiError | null;
}

export function useContracts(initialData?: ContractsResponse) {
  const [state, setState] = useState<UseContractsState>({
    contracts: initialData?.data ?? [],
    totals: initialData?.totals ?? null,
    pagination: initialData?.pagination ?? null,
    isLoading: false,  // start non-loading: table is empty by default
    error: null,
  });

  const [query, setQuery] = useState<ContractsQuery>({
    page: 1,
    pageSize: 20,
  });

  const isMounted = useRef(false);

  const fetchData = useCallback(async (q: ContractsQuery) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: String(q.pageSize),
        ...(q.sortBy ? { sortBy: q.sortBy } : {}),
        ...(q.sortOrder ? { sortOrder: q.sortOrder } : {}),
      });

      // Route through Next.js proxy rewrite → Express backend
      const res = await fetch(`/api/proxy/contracts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ContractsResponse = await res.json();

      setState({
        contracts: data.data,
        totals: data.totals,
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
          message: err instanceof Error ? err.message : 'Failed to fetch',
          status: 0,
        },
      }));
    }
  }, []);

  useEffect(() => {
    // Skip the very first mount — table starts empty, data is added via Contract Config.
    // Subsequent query changes (pagination, sort) still trigger a fetch.
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    fetchData(query);
  }, [query, fetchData]);

  const retry = useCallback(() => {
    fetchData(query);
  }, [fetchData, query]);

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setQuery((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  return {
    ...state,
    query,
    setPage,
    setSort,
    retry,
  };
}
