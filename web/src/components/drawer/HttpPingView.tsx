import React from 'react';
import { Activity, Globe, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { HydratedTotem, TotemLogsResponse } from '../../types/aether';
import {
  formatCompactDateTime,
  formatDurationMs,
  formatFullDateTime,
} from '../../utils/dateFormat';
import {
  getHttpStatusText,
  parseHttpMetrics,
  STATUS_PRESENTATION,
} from '../../utils/totemPresentation';
import {
  DrawerEmptyState,
  DrawerErrorState,
  DrawerLogsSkeleton,
  DrawerPagination,
} from './DrawerStates';

export interface HttpPingViewProps {
  totem: HydratedTotem;
  logsData?: TotemLogsResponse;
  isLoadingLogs: boolean;
  isFetchingLogs: boolean;
  logsError: Error | null;
  onRetryLogs: () => void;
  onPageChange: (page: number) => void;
}

export const HttpPingView: React.FC<HttpPingViewProps> = ({
  totem,
  logsData,
  isLoadingLogs,
  isFetchingLogs,
  logsError,
  onRetryLogs,
  onPageChange,
}) => {
  const metrics = parseHttpMetrics(totem.lastMetrics);
  const isOkCode =
    typeof metrics.statusCode === 'number' &&
    metrics.statusCode >= 200 &&
    metrics.statusCode < 300;
  const isHighLatency =
    typeof metrics.latencyMs === 'number' && metrics.latencyMs >= 3000;

  return (
    <div className="space-y-5">
      {/* Cards de Resumo */}
      <section aria-label="Resumo de conectividade" className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-card)] p-3">
          <span className="flex items-center gap-1 text-[10px] tracking-wider text-[var(--text-secondary)] uppercase">
            <Globe className="h-3 w-3 text-violet-300" aria-hidden="true" />
            HTTP
          </span>
          <span
            className={cn(
              'mt-1.5 block font-mono text-sm font-semibold',
              metrics.statusCode === undefined
                ? 'text-[var(--text-secondary)]'
                : isOkCode
                  ? 'text-emerald-300'
                  : 'text-red-400',
            )}
          >
            {metrics.statusCode !== undefined
              ? getHttpStatusText(metrics.statusCode)
              : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-card)] p-3">
          <span className="flex items-center gap-1 text-[10px] tracking-wider text-[var(--text-secondary)] uppercase">
            <Activity className="h-3 w-3 text-violet-300" aria-hidden="true" />
            Latência
          </span>
          <span
            className={cn(
              'mt-1.5 block font-mono text-sm font-semibold',
              metrics.latencyMs === undefined
                ? 'text-[var(--text-secondary)]'
                : isHighLatency
                  ? 'text-amber-400'
                  : 'text-[var(--text-primary)]',
            )}
          >
            {metrics.latencyMs !== undefined
              ? `${Math.round(metrics.latencyMs)} ms`
              : '—'}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-card)] p-3">
          <span className="flex items-center gap-1 text-[10px] tracking-wider text-[var(--text-secondary)] uppercase">
            {metrics.isReachable === false ? (
              <WifiOff className="h-3 w-3 text-red-400" aria-hidden="true" />
            ) : (
              <Wifi className="h-3 w-3 text-violet-300" aria-hidden="true" />
            )}
            Rede
          </span>
          <span
            className={cn(
              'mt-1.5 block text-xs font-semibold',
              metrics.isReachable === true
                ? 'text-emerald-300'
                : metrics.isReachable === false
                  ? 'text-red-400'
                  : 'text-[var(--text-secondary)]',
            )}
          >
            {metrics.isReachable === true
              ? 'Acessível'
              : metrics.isReachable === false
                ? 'Inacessível'
                : 'Aguardando'}
          </span>
        </div>
      </section>

      {/* Histórico de Verificações */}
      <section aria-label="Histórico de verificações" className="space-y-2.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
          Histórico de Verificações
        </h3>

        {isLoadingLogs && <DrawerLogsSkeleton />}

        {!isLoadingLogs && logsError && (
          <DrawerErrorState error={logsError} onRetry={onRetryLogs} />
        )}

        {!isLoadingLogs && !logsError && logsData && logsData.logs.length === 0 && (
          <DrawerEmptyState />
        )}

        {!isLoadingLogs && !logsError && logsData && logsData.logs.length > 0 && (
          <>
            <ul className="space-y-2">
              {logsData.logs.map((log) => {
                const statusInfo = STATUS_PRESENTATION[log.status];
                const StatusIcon = statusInfo.Icon;
                const logHttp = parseHttpMetrics(
                  log.metrics as Record<string, unknown>,
                );

                return (
                  <li
                    key={log.id}
                    className="rounded-lg border border-white/10 bg-[var(--surface-card)] px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={cn('h-3.5 w-3.5 shrink-0', statusInfo.textClass)}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {getHttpStatusText(logHttp.statusCode)}
                        </span>
                        {logHttp.latencyMs !== undefined && (
                          <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                            {formatDurationMs(logHttp.latencyMs)}
                          </span>
                        )}
                      </div>

                      <time
                        dateTime={log.timestamp}
                        title={formatFullDateTime(log.timestamp)}
                        className="font-mono text-[11px] text-[var(--text-secondary)]"
                      >
                        {formatCompactDateTime(log.timestamp)}
                      </time>
                    </div>

                    {log.summary && (
                      <p className="mt-1.5 rounded bg-red-500/10 px-2 py-1 font-mono text-[11px] text-red-200/90">
                        {log.summary}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <DrawerPagination
              pagination={logsData.pagination}
              isFetching={isFetchingLogs}
              onPageChange={onPageChange}
            />
          </>
        )}
      </section>
    </div>
  );
};
