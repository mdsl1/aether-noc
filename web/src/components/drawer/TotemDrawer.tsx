import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useForceCheck } from '../../hooks/useForceCheck';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTotemLogs } from '../../hooks/useTotemLogs';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { HydratedIsland, HydratedTotem } from '../../types/aether';
import {
  formatFullDateTime,
  formatRelativeTime,
} from '../../utils/dateFormat';
import {
  STATUS_PRESENTATION,
  TOTEM_TYPE_LABEL,
} from '../../utils/totemPresentation';
import { HttpPingView } from './HttpPingView';
import { N8nWorkflowView } from './N8nWorkflowView';
import { VmHeartbeatView } from './VmHeartbeatView';

export interface SelectedTotemContext {
  island: HydratedIsland;
  totem: HydratedTotem;
}

export interface TotemDrawerProps {
  selected: SelectedTotemContext | null;
  onClose: () => void;
}

export const TotemDrawer: React.FC<TotemDrawerProps> = ({
  selected,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const [page, setPage] = useState(1);

  const totemId = selected?.totem.totemId ?? null;
  const forceCheck = useForceCheck();

  const {
    data: logsData,
    isLoading: isLoadingLogs,
    isFetching: isFetchingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useTotemLogs(totemId, page, 20);

  // Reseta página e erro de force check ao trocar de totem
  useEffect(() => {
    setPage(1);
    forceCheck.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totemId]);

  // Fecha com tecla Escape
  useEffect(() => {
    if (!selected) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, onClose]);

  const panelInitial = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
      ? { y: '100%' }
      : { x: '100%' };

  const panelAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : isMobile
      ? { y: 0 }
      : { x: 0 };

  const panelExit = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
      ? { y: '100%' }
      : { x: '100%' };

  const forceCheckErrorMessage = (() => {
    if (!forceCheck.error) {
      return null;
    }
    if (forceCheck.error instanceof ApiError && forceCheck.error.status === 429) {
      return 'Limite de Force Checks excedido (10/min). Aguarde um instante.';
    }
    return forceCheck.error.message;
  })();

  return (
    <AnimatePresence>
      {selected && (
        <div
          key="totem-drawer-layer"
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="totem-drawer-title"
        >
          {/* Backdrop escuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Painel Lateral (Desktop) / Bottom Sheet (Mobile) */}
          <motion.aside
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.26,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              'fixed z-10 flex flex-col border-[var(--border-arcane)] bg-[var(--surface-glass)] shadow-2xl shadow-black/75 backdrop-blur-md',
              isMobile
                ? 'inset-x-0 bottom-0 h-[90vh] rounded-t-2xl border-t'
                : 'top-0 right-0 h-full w-[460px] max-w-full border-l',
            )}
          >
            {/* Indicador visual de Bottom Sheet no Mobile */}
            {isMobile && (
              <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>
            )}

            {/* Cabeçalho Fixo */}
            {(() => {
              const { island, totem } = selected;
              const statusInfo = STATUS_PRESENTATION[totem.status];
              const StatusIcon = statusInfo.Icon;
              const isVmHeartbeat = totem.type === 'vm_heartbeat';
              const isChecking = forceCheck.isPending;

              return (
                <>
                  <header className="shrink-0 border-b border-[var(--border-arcane)] px-5 pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium tracking-wider text-violet-300/90 uppercase">
                          Ilha {island.name}
                        </p>
                        <h2
                          id="totem-drawer-title"
                          className="mt-0.5 truncate text-lg font-semibold text-[var(--text-primary)]"
                        >
                          {totem.name}
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar painel de detalhes"
                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--text-secondary)] transition-colors hover:border-white/25 hover:bg-white/10 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Badges de Status + Tipo */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          statusInfo.badgeClass,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{statusInfo.label}</span>
                      </span>

                      <span className="inline-flex items-center rounded-full border border-[var(--border-arcane)] bg-[var(--surface-card)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                        {TOTEM_TYPE_LABEL[totem.type]}
                      </span>
                    </div>

                    {/* Timestamp + Ação Force Check */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-secondary)]"
                        title={formatFullDateTime(totem.lastCheckAt)}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-violet-300/80" aria-hidden="true" />
                        <span>{formatRelativeTime(totem.lastCheckAt)}</span>
                        {totem.lastCheckAt && (
                          <span className="hidden text-white/35 sm:inline">•</span>
                        )}
                        {totem.lastCheckAt && (
                          <span className="hidden sm:inline">
                            {formatFullDateTime(totem.lastCheckAt)}
                          </span>
                        )}
                      </div>

                      {isVmHeartbeat ? (
                        <div className="group/force relative inline-flex">
                          <button
                            type="button"
                            disabled
                            title="Atualizado automaticamente via heartbeat da VM"
                            aria-describedby="vm-force-check-hint"
                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] opacity-60"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Force Check</span>
                          </button>
                          <span
                            id="vm-force-check-hint"
                            role="tooltip"
                            className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 hidden w-56 rounded-md border border-[var(--border-arcane)] bg-[#090B1A]/95 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] shadow-lg group-hover/force:block"
                          >
                            Atualizado automaticamente via heartbeat da VM
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isChecking}
                          onClick={() => forceCheck.mutate(totem.totemId)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-400/45 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isChecking ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>{isChecking ? 'Verificando...' : 'Force Check'}</span>
                        </button>
                      )}
                    </div>

                    {/* Motivo do Status Atual */}
                    {totem.statusReason && (
                      <div
                        className={cn(
                          'mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                          totem.status === 'critical'
                            ? 'border-red-500/40 bg-red-500/15 text-red-200'
                            : 'border-amber-500/40 bg-amber-500/15 text-amber-200',
                        )}
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="break-words">{totem.statusReason}</span>
                      </div>
                    )}

                    {/* Erro de Force Check */}
                    {forceCheckErrorMessage && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{forceCheckErrorMessage}</span>
                      </div>
                    )}
                  </header>

                  {/* Corpo Scrollável Dinâmico por Tipo */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {totem.type === 'vm_heartbeat' && (
                      <VmHeartbeatView
                        totem={totem}
                        logsData={logsData}
                        isLoadingLogs={isLoadingLogs}
                        isFetchingLogs={isFetchingLogs}
                        logsError={logsError}
                        onRetryLogs={() => void refetchLogs()}
                        onPageChange={setPage}
                      />
                    )}

                    {totem.type === 'n8n_workflow' && (
                      <N8nWorkflowView
                        totem={totem}
                        logsData={logsData}
                        isLoadingLogs={isLoadingLogs}
                        isFetchingLogs={isFetchingLogs}
                        logsError={logsError}
                        onRetryLogs={() => void refetchLogs()}
                        onPageChange={setPage}
                      />
                    )}

                    {(totem.type === 'http_ping' ||
                      totem.type === 'supabase_health') && (
                      <HttpPingView
                        totem={totem}
                        logsData={logsData}
                        isLoadingLogs={isLoadingLogs}
                        isFetchingLogs={isFetchingLogs}
                        logsError={logsError}
                        onRetryLogs={() => void refetchLogs()}
                        onPageChange={setPage}
                      />
                    )}
                  </div>
                </>
              );
            })()}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
