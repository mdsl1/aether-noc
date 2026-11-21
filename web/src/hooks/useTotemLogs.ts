import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { ApiError, fetchTotemLogs } from '../lib/api';
import type { TotemLogsResponse } from '../types/aether';

export const totemLogsQueryKey = (totemId: string, page: number, limit: number) =>
  ['totem-logs', totemId, page, limit] as const;

export function useTotemLogs(
  totemId: string | null,
  page: number,
  limit = 20,
) {
  const { token, logout } = useAuth();

  const query = useQuery<TotemLogsResponse, Error>({
    queryKey: totemLogsQueryKey(totemId ?? '', page, limit),
    queryFn: ({ signal }) => {
      if (!token) {
        throw new ApiError(401, 'Não autenticado');
      }
      if (!totemId) {
        throw new Error('Totem inválido');
      }
      return fetchTotemLogs(token, totemId, page, limit, signal);
    },
    enabled: Boolean(token && totemId),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      logout();
    }
  }, [query.error, logout]);

  return query;
}
