import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL } from '../lib/api';
import type {
  IslandsResponse,
  IslandsSummary,
  SseConnectionState,
  TotemUpdatedSsePayload,
} from '../types/aether';
import { ISLANDS_QUERY_KEY } from './useIslands';

class FatalStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalStreamError';
  }
}

function recalculateSummary(islands: IslandsResponse['islands']): IslandsSummary {
  const summary: IslandsSummary = {
    totalTotems: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0,
  };

  for (const island of islands) {
    for (const totem of island.totems) {
      summary.totalTotems += 1;
      summary[totem.status] += 1;
    }
  }

  return summary;
}

export function applyTotemUpdateToCache(
  current: IslandsResponse | undefined,
  payload: TotemUpdatedSsePayload,
): IslandsResponse | undefined {
  if (!current) {
    return current;
  }

  let matchedIsland = false;
  let matchedTotem = false;

  const nextIslands = current.islands.map((island) => {
    if (island.slug !== payload.islandSlug) {
      return island;
    }

    matchedIsland = true;

    const nextTotems = island.totems.map((totem) => {
      if (totem.totemId !== payload.totem.totemId) {
        return totem;
      }

      matchedTotem = true;
      return {
        ...totem,
        status: payload.totem.status,
        statusReason: payload.totem.statusReason,
        lastCheckAt: payload.totem.lastCheckAt,
        lastStatusChangeAt: payload.totem.lastStatusChangeAt,
        lastMetrics: payload.totem.lastMetrics,
      };
    });

    if (!matchedTotem && island.status === payload.islandStatus) {
      return island;
    }

    return {
      ...island,
      status: payload.islandStatus,
      totems: nextTotems,
    };
  });

  if (!matchedIsland) {
    return current;
  }

  return {
    ...current,
    generatedAt: new Date().toISOString(),
    summary: recalculateSummary(nextIslands),
    islands: nextIslands,
  };
}

export interface AetherStreamResult {
  connectionState: SseConnectionState;
  islandPulses: Record<string, number>;
}

export function useAetherStream(): AetherStreamResult {
  const { token, clearSession } = useAuth();
  const queryClient = useQueryClient();
  const [streamState, setStreamState] =
    useState<SseConnectionState>('reconnecting');
  const [islandPulses, setIslandPulses] = useState<Record<string, number>>({});
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    if (!token) {
      hasConnectedOnceRef.current = false;
      return;
    }

    const controller = new AbortController();
    let isDisposed = false;

    void fetchEventSource(`${API_BASE_URL}/api/stream`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
      openWhenHidden: true,
      async onopen(response) {
        if (response.status === 401) {
          clearSession();
          throw new FatalStreamError('Sessão expirada');
        }

        if (!response.ok) {
          throw new Error(`Falha ao abrir stream SSE (HTTP ${response.status})`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('text/event-stream')) {
          throw new Error(`Content-Type inesperado no SSE: ${contentType}`);
        }

        if (isDisposed) {
          return;
        }

        setStreamState('connected');

        if (hasConnectedOnceRef.current) {
          void queryClient.invalidateQueries({ queryKey: ISLANDS_QUERY_KEY });
        } else {
          hasConnectedOnceRef.current = true;
        }
      },
      onmessage(event) {
        if (isDisposed || event.event !== 'totem.updated' || !event.data) {
          return;
        }

        try {
          const payload = JSON.parse(event.data) as TotemUpdatedSsePayload;
          queryClient.setQueryData<IslandsResponse>(
            ISLANDS_QUERY_KEY,
            (current) => applyTotemUpdateToCache(current, payload),
          );
          void queryClient.invalidateQueries({
            queryKey: ['totem-logs', payload.totem.totemId],
            refetchType: 'active',
          });
          setIslandPulses((prev) => ({
            ...prev,
            [payload.islandSlug]: (prev[payload.islandSlug] ?? 0) + 1,
          }));
        } catch {
          // Ignore malformed SSE frame without breaking the stream
        }
      },
      onclose() {
        if (!isDisposed) {
          setStreamState('reconnecting');
          throw new Error('Conexão SSE encerrada pelo servidor');
        }
      },
      onerror(error) {
        if (isDisposed) {
          return;
        }

        if (error instanceof FatalStreamError) {
          setStreamState('disconnected');
          throw error;
        }

        setStreamState('reconnecting');
        return 3_000;
      },
    }).catch(() => {
      if (!isDisposed) {
        setStreamState('disconnected');
      }
    });

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, [token, clearSession, queryClient]);

  return {
    connectionState: token ? streamState : 'disconnected',
    islandPulses,
  };
}
