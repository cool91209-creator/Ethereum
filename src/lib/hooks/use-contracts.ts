'use client';

import { useState, useEffect, useCallback } from 'react';
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
    isLoading: !initialData,
    error: null,
  });

  const [query, setQuery] = useState<ContractsQuery>({
    page: 1,
    pageSize: 20,
  });

  const fetchData = useCallback(async (q: ContractsQuery) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: String(q.pageSize),
        ...(q.sortBy ? { sortBy: q.sortBy } : {}),
        ...(q.sortOrder ? { sortOrder: q.sortOrder } : {}),
      });

      const res = await fetch(`/api/contracts?${params}`);
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
    // Skip initial fetch if we have SSR data and haven't changed query
    if (initialData && query.page === 1 && !query.sortBy) return;
    fetchData(query);
  }, [query, fetchData, initialData]);

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
