import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { ApiError, fetchIslands } from '../lib/api';
import type { IslandsResponse } from '../types/aether';

export const ISLANDS_QUERY_KEY = ['islands'] as const;

export function useIslands() {
  const { token, clearSession } = useAuth();

  const query = useQuery<IslandsResponse, Error>({
    queryKey: ISLANDS_QUERY_KEY,
    queryFn: ({ signal }) => {
      if (!token) {
        throw new ApiError(401, 'Não autenticado');
      }
      return fetchIslands(token, signal);
    },
    enabled: Boolean(token),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      clearSession();
    }
  }, [query.error, clearSession]);

  return query;
}
