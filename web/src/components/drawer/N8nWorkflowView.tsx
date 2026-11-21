import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Power,
  Sparkles,
  XOctagon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type {
  HydratedTotem,
  TotemLogItem,
  TotemLogsResponse,
} from '../../types/aether';
import {
  formatCompactDateTime,
  formatCount,
  formatDurationMs,
  formatFullDateTime,
} from '../../utils/dateFormat';
import {
  getExecutionStatusLabel,
  parseN8nMetrics,
} from '../../utils/totemPresentation';
import {
  DrawerEmptyState,
  DrawerErrorState,
  DrawerLogsSkeleton,
  DrawerPagination,
} from './DrawerStates';

function ExecutionRow({ log }: { log: TotemLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const metrics = parseN8nMetrics(log.metrics as Record<string, unknown>);
  const execStatus = metrics.executionStatus;
  const isSuccess = execStatus === 'success';
  const isError = execStatus === 'error' || execStatus === 'crashed';
  const hasErrorDetails = Boolean(log.summary);

  return (
    <li className="rounded-lg border border-white/10 bg-[var(--surface-card)] px-3.5 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isSuccess ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
          ) : isError ? (
            <XOctagon
              className="h-4 w-4 shrink-0 text-red-400"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-amber-400"
              aria-hidden="true"
            />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                {metrics.executionId ? `#${metrics.executionId}` : getExecutionStatusLabel(execStatus)}
              </span>
              {metrics.durationMs !== undefined && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)]">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatDurationMs(metrics.durationMs)}
                </span>
              )}
            </div>

            <time
              dateTime={log.timestamp}
              title={formatFullDateTime(log.timestamp)}
              className="mt-0.5 block font-mono text-[11px] text-[var(--text-secondary)]"
            >
              {formatCompactDateTime(log.timestamp)}
            </time>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {metrics.tokenUsage && metrics.tokenUsage.totalTokens > 0 && (
            <span
              title={`Prompt: ${formatCount(metrics.tokenUsage.promptTokens)} • Completion: ${formatCount(metrics.tokenUsage.completionTokens)}`}
              className="inline-flex items-center gap-1 rounded-full border border-violet-400/35 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-medium text-violet-200"
            >
              <Sparkles className="h-2.5 w-2.5 text-violet-300" aria-hidden="true" />
              {formatCount(metrics.tokenUsage.totalTokens)} tok
            </span>
          )}

          {hasErrorDetails && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Ocultar erro' : 'Expandir erro'}
              className="inline-flex cursor-pointer items-center rounded p-1 text-red-300 transition-colors hover:bg-red-500/20"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {hasErrorDetails && (
        <div
          className={cn(
            'mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 font-mono text-[11px] text-red-200/90',
            !expanded && 'line-clamp-2',
          )}
        >
          {log.summary}
        </div>
      )}
    </li>
  );
}

export interface N8nWorkflowViewProps {
  totem: HydratedTotem;
  logsData?: TotemLogsResponse;
  isLoadingLogs: boolean;
  isFetchingLogs: boolean;
  logsError: Error | null;
  onRetryLogs: () => void;
  onPageChange: (page: number) => void;
}

export const N8nWorkflowView: React.FC<N8nWorkflowViewProps> = ({
  totem,
  logsData,
  isLoadingLogs,
  isFetchingLogs,
  logsError,
  onRetryLogs,
  onPageChange,
}) => {
  const latestMetrics = parseN8nMetrics(totem.lastMetrics);
  const firstLogMetrics =
    logsData?.logs[0] !== undefined
      ? parseN8nMetrics(logsData.logs[0].metrics as Record<string, unknown>)
      : {};
  const workflowActive =
    latestMetrics.workflowActive ?? firstLogMetrics.workflowActive;

  const tokenSummary = logsData?.tokenSummary ?? null;
  const showTokenCard =
    Boolean(tokenSummary && tokenSummary.totalTokens > 0) ||
    (totem.tracksLlmTokens && tokenSummary !== null);

  return (
    <div className="space-y-5">
      {/* Status do Workflow */}
      <section aria-label="Status do Workflow" className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-card)] px-4 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <Power className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            <span>Status no n8n</span>
          </span>

          {workflowActive === true ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Ativo
            </span>
          ) : workflowActive === false ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
              Desativado no n8n
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/35 bg-slate-500/15 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              Desconhecido
            </span>
          )}
        </div>
      </section>

      {/* Card de Consumo de Tokens LLM (apenas quando aplicável) */}
      {showTokenCard && tokenSummary && (
        <section aria-label="Consumo de tokens LLM" className="space-y-2.5">
          <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
            Consumo de Tokens LLM
          </h3>

          <div className="rounded-xl border border-violet-400/35 bg-[var(--surface-card)] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Sparkles className="h-4 w-4 text-violet-300" aria-hidden="true" />
                <span>Total no histórico</span>
              </span>
              <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                {formatCount(tokenSummary.totalTokens)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3">
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="block text-[10px] tracking-wider text-[var(--text-secondary)] uppercase">
                  Prompt
                </span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-cyan-300">
                  {formatCount(tokenSummary.promptTokens)}
                </span>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="block text-[10px] tracking-wider text-[var(--text-secondary)] uppercase">
                  Completion
                </span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-violet-300">
                  {formatCount(tokenSummary.completionTokens)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Histórico de Execuções */}
      <section aria-label="Histórico de execuções" className="space-y-2.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
          Histórico de Execuções
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
              {logsData.logs.map((log) => (
                <ExecutionRow key={log.id} log={log} />
              ))}
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
