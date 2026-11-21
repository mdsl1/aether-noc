import React from 'react';
import { Box, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { HydratedTotem, TotemLogsResponse } from '../../types/aether';
import {
  formatCompactDateTime,
  formatFullDateTime,
  formatMemoryMb,
} from '../../utils/dateFormat';
import {
  parseVmMetrics,
  STATUS_PRESENTATION,
} from '../../utils/totemPresentation';
import {
  DrawerEmptyState,
  DrawerErrorState,
  DrawerLogsSkeleton,
  DrawerPagination,
} from './DrawerStates';

function getThresholdBarColor(percent: number | undefined): string {
  if (percent === undefined) {
    return 'bg-slate-500';
  }
  if (percent >= 90) {
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]';
  }
  if (percent >= 80) {
    return 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.55)]';
  }
  return 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
}

function getThresholdTextColor(percent: number | undefined): string {
  if (percent === undefined) {
    return 'text-[var(--text-secondary)]';
  }
  if (percent >= 90) {
    return 'text-red-400';
  }
  if (percent >= 80) {
    return 'text-amber-400';
  }
  return 'text-emerald-300';
}

export interface VmHeartbeatViewProps {
  totem: HydratedTotem;
  logsData?: TotemLogsResponse;
  isLoadingLogs: boolean;
  isFetchingLogs: boolean;
  logsError: Error | null;
  onRetryLogs: () => void;
  onPageChange: (page: number) => void;
}

export const VmHeartbeatView: React.FC<VmHeartbeatViewProps> = ({
  totem,
  logsData,
  isLoadingLogs,
  isFetchingLogs,
  logsError,
  onRetryLogs,
  onPageChange,
}) => {
  const metrics = parseVmMetrics(totem.lastMetrics);
  const ramPercent = metrics.ramUsedPercent;
  const diskPercent = metrics.diskPercent;
  const cpuLoad = metrics.cpuLoad1m;
  // Normaliza visualmente CPU load 1m (escala 0..4 como barra de referência)
  const cpuBarPercent =
    cpuLoad !== undefined ? Math.min(100, Math.max(4, (cpuLoad / 4) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Bloco de Recursos */}
      <section aria-label="Recursos da VM" className="space-y-3">
        <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
          Recursos do Servidor
        </h3>

        <div className="space-y-3.5 rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-card)] p-4">
          {/* CPU Load (1m) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Cpu className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                <span>CPU Load (1m)</span>
              </span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  getThresholdTextColor(cpuLoad !== undefined ? (cpuLoad / 4) * 100 : undefined),
                )}
              >
                {cpuLoad !== undefined ? cpuLoad.toFixed(2) : '—'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  getThresholdBarColor(cpuLoad !== undefined ? (cpuLoad / 4) * 100 : undefined),
                )}
                style={{ width: `${cpuLoad !== undefined ? cpuBarPercent : 0}%` }}
              />
            </div>
          </div>

          {/* Memória RAM */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                <MemoryStick
                  className="h-3.5 w-3.5 text-violet-300"
                  aria-hidden="true"
                />
                <span>Memória RAM</span>
              </span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  getThresholdTextColor(ramPercent),
                )}
              >
                {metrics.ramUsedMb !== undefined &&
                metrics.ramTotalMb !== undefined &&
                ramPercent !== undefined
                  ? `${formatMemoryMb(metrics.ramUsedMb)} / ${formatMemoryMb(metrics.ramTotalMb)} — ${Math.round(ramPercent)}%`
                  : ramPercent !== undefined
                    ? `${Math.round(ramPercent)}%`
                    : '—'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  getThresholdBarColor(ramPercent),
                )}
                style={{
                  width: `${ramPercent !== undefined ? Math.min(100, Math.max(0, ramPercent)) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Disco */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                <HardDrive
                  className="h-3.5 w-3.5 text-violet-300"
                  aria-hidden="true"
                />
                <span>Disco</span>
              </span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  getThresholdTextColor(diskPercent),
                )}
              >
                {diskPercent !== undefined ? `${Math.round(diskPercent)}%` : '—'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  getThresholdBarColor(diskPercent),
                )}
                style={{
                  width: `${diskPercent !== undefined ? Math.min(100, Math.max(0, diskPercent)) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Containers Docker */}
      <section aria-label="Containers Docker" className="space-y-2.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
          Containers Docker
        </h3>

        {metrics.containers && metrics.containers.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {metrics.containers.map((container) => {
              const isRunning = container.status.toLowerCase() === 'running';
              return (
                <div
                  key={container.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[var(--surface-card)] px-3.5 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Box
                      className="h-4 w-4 shrink-0 text-violet-300"
                      aria-hidden="true"
                    />
                    <span className="truncate font-mono text-xs font-medium text-[var(--text-primary)]">
                      {container.name}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold lowercase',
                      isRunning
                        ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                        : 'border-red-500/45 bg-red-500/20 text-red-300',
                    )}
                  >
                    {container.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border-arcane)] bg-[var(--surface-card)]/40 px-3.5 py-4 text-center text-xs text-[var(--text-secondary)]">
            Nenhum container reportado no último heartbeat.
          </div>
        )}
      </section>

      {/* Histórico de Heartbeats */}
      <section aria-label="Histórico de heartbeats" className="space-y-2.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
          Histórico de Heartbeats
        </h3>

        {isLoadingLogs && <DrawerLogsSkeleton rows={4} />}

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
                const logVm = parseVmMetrics(
                  log.metrics as Record<string, unknown>,
                );
                return (
                  <li
                    key={log.id}
                    className="rounded-lg border border-white/10 bg-[var(--surface-card)] px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          statusInfo.textClass,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{statusInfo.label}</span>
                      </span>
                      <time
                        dateTime={log.timestamp}
                        title={formatFullDateTime(log.timestamp)}
                        className="font-mono text-[11px] text-[var(--text-secondary)]"
                      >
                        {formatCompactDateTime(log.timestamp)}
                      </time>
                    </div>

                    {(logVm.ramUsedPercent !== undefined ||
                      logVm.diskPercent !== undefined ||
                      logVm.cpuLoad1m !== undefined) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
                        {logVm.cpuLoad1m !== undefined && (
                          <span>CPU {logVm.cpuLoad1m.toFixed(2)}</span>
                        )}
                        {logVm.ramUsedPercent !== undefined && (
                          <span>RAM {Math.round(logVm.ramUsedPercent)}%</span>
                        )}
                        {logVm.diskPercent !== undefined && (
                          <span>Disco {Math.round(logVm.diskPercent)}%</span>
                        )}
                      </div>
                    )}

                    {log.summary && (
                      <p className="mt-1.5 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-200/90">
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
