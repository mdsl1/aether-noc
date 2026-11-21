import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { ApiError, triggerForceCheck } from '../lib/api';
import type { ForceCheckResponse } from '../types/aether';
import { ISLANDS_QUERY_KEY } from './useIslands';

export function useForceCheck() {
  const { token, logout } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<ForceCheckResponse, Error, string>({
    mutationFn: async (totemId: string) => {
      if (!token) {
        throw new ApiError(401, 'Não autenticado');
      }
      return triggerForceCheck(token, totemId);
    },
    onSuccess: (_data, totemId) => {
      void queryClient.invalidateQueries({ queryKey: ISLANDS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['totem-logs', totemId] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        logout();
      }
    },
  });
}
