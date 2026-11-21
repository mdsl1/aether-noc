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

const STREAM_STALE_TIMEOUT_MS = 65_000;
const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 15_000;

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

    let isDisposed = false;
    let activeController: AbortController | null = null;
    let staleTimerId: number | null = null;
    let retryTimerId: number | null = null;
    let retryAttempt = 0;

    const clearStaleTimer = () => {
      if (staleTimerId !== null) {
        window.clearTimeout(staleTimerId);
        staleTimerId = null;
      }
    };

    const clearRetryTimer = () => {
      if (retryTimerId !== null) {
        window.clearTimeout(retryTimerId);
        retryTimerId = null;
      }
    };

    const invalidateSyncedData = () => {
      void queryClient.invalidateQueries({ queryKey: ISLANDS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: ['totem-logs'],
        refetchType: 'active',
      });
    };

    const scheduleReconnect = (delayMs = 0) => {
      if (isDisposed) {
        return;
      }
      clearRetryTimer();
      clearStaleTimer();
      activeController?.abort();

      if (delayMs <= 0) {
        connect();
        return;
      }

      retryTimerId = window.setTimeout(() => {
        retryTimerId = null;
        connect();
      }, delayMs);
    };

    const armStaleTimer = () => {
      clearStaleTimer();
      if (isDisposed || document.hidden) {
        return;
      }
      staleTimerId = window.setTimeout(() => {
        if (isDisposed || document.hidden) {
          return;
        }
        setStreamState('reconnecting');
        scheduleReconnect(0);
      }, STREAM_STALE_TIMEOUT_MS);
    };

    const connect = () => {
      if (isDisposed) {
        return;
      }

      clearRetryTimer();
      clearStaleTimer();
      activeController?.abort();

      const controller = new AbortController();
      activeController = controller;
      const isCurrentAttempt = () =>
        !isDisposed && activeController === controller;

      void fetchEventSource(`${API_BASE_URL}/api/stream`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
        openWhenHidden: false,
        async onopen(response) {
          if (!isCurrentAttempt()) {
            return;
          }

          if (response.status === 401) {
            clearStaleTimer();
            clearSession();
            throw new FatalStreamError('Sessão expirada');
          }

          if (!response.ok) {
            throw new Error(
              `Falha ao abrir stream SSE (HTTP ${response.status})`,
            );
          }

          const contentType = response.headers.get('content-type') ?? '';
          if (!contentType.includes('text/event-stream')) {
            throw new Error(`Content-Type inesperado no SSE: ${contentType}`);
          }

          retryAttempt = 0;
          setStreamState('connected');
          armStaleTimer();

          if (hasConnectedOnceRef.current) {
            invalidateSyncedData();
          } else {
            hasConnectedOnceRef.current = true;
          }
        },
        onmessage(event) {
          if (!isCurrentAttempt()) {
            return;
          }

          armStaleTimer();

          if (event.event !== 'totem.updated' || !event.data) {
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
          if (!isCurrentAttempt()) {
            return;
          }
          clearStaleTimer();
          setStreamState('reconnecting');
          throw new Error('Conexão SSE encerrada pelo servidor');
        },
        onerror(error) {
          if (!isCurrentAttempt()) {
            throw error instanceof Error
              ? error
              : new Error('Conexão SSE substituída');
          }

          clearStaleTimer();

          if (error instanceof FatalStreamError) {
            setStreamState('disconnected');
            throw error;
          }

          setStreamState('reconnecting');
          const delayMs = Math.min(
            MAX_RECONNECT_DELAY_MS,
            BASE_RECONNECT_DELAY_MS * 2 ** retryAttempt,
          );
          retryAttempt += 1;
          return delayMs;
        },
      }).catch(() => {
        if (isCurrentAttempt() && !controller.signal.aborted) {
          setStreamState('disconnected');
        }
      });
    };

    const handleVisibilityChange = () => {
      if (isDisposed) {
        return;
      }

      if (document.hidden) {
        clearStaleTimer();
        clearRetryTimer();
      } else {
        setStreamState('reconnecting');
      }
    };

    const handleOnline = () => {
      if (isDisposed || document.hidden) {
        return;
      }
      retryAttempt = 0;
      setStreamState('reconnecting');
      invalidateSyncedData();
      scheduleReconnect(0);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    connect();

    return () => {
      isDisposed = true;
      clearStaleTimer();
      clearRetryTimer();
      activeController?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [token, clearSession, queryClient]);

  return {
    connectionState: token ? streamState : 'disconnected',
    islandPulses,
  };
}
