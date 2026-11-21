import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LocateFixed,
  LogOut,
  XOctagon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { IslandsSummary, SseConnectionState } from '../../types/aether';

const SSE_STATUS_CONFIG: Record<
  SseConnectionState,
  { label: string; dotClass: string; textClass: string }
> = {
  connected: {
    label: 'Tempo Real',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    textClass: 'text-emerald-300',
  },
  reconnecting: {
    label: 'Reconectando...',
    dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    textClass: 'text-amber-300',
  },
  disconnected: {
    label: 'Offline',
    dotClass: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]',
    textClass: 'text-red-300',
  },
};

export interface TopHudProps {
  connectionState: SseConnectionState;
  summary?: IslandsSummary;
  onFocusCritical?: () => void;
  onFocusWarning?: () => void;
  onRecenter: () => void;
  onLogout: () => void;
}

export const TopHud: React.FC<TopHudProps> = React.memo(
  ({
    connectionState,
    summary,
    onFocusCritical,
    onFocusWarning,
    onRecenter,
    onLogout,
  }) => {
    const sse = SSE_STATUS_CONFIG[connectionState];

    return (
      <header className="fixed top-4 right-4 left-4 z-40 flex h-14 items-center justify-between gap-3 rounded-xl border border-[var(--border-arcane)] bg-[var(--surface-glass)] px-3.5 shadow-xl shadow-black/50 backdrop-blur-md sm:px-5">
        {/* Esquerda: Logo + Indicador SSE */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="font-display text-sm tracking-[0.18em] text-[var(--text-primary)] select-none sm:text-base">
            A.E.T.H.E.R.
          </span>

          <span
            aria-hidden="true"
            className="h-4 w-px bg-[var(--border-arcane)]"
          />

          <div
            className="flex items-center gap-2 text-xs font-medium"
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 shrink-0 rounded-full', sse.dotClass)}
            />
            <span className={cn('truncate', sse.textClass)}>{sse.label}</span>
          </div>
        </div>

        {/* Centro: Resumo global dinâmico (oculto em telas muito estreitas) */}
        {summary && (
          <div className="hidden items-center gap-2 md:flex">
            {summary.critical > 0 ? (
              <button
                type="button"
                onClick={onFocusCritical}
                title="Focar câmera na ilha com alerta crítico"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <XOctagon className="h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden="true" />
                <span>
                  {summary.critical}{' '}
                  {summary.critical === 1 ? 'Alerta Crítico' : 'Alertas Críticos'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <span className="font-mono">
                  {summary.healthy}/{summary.totalTotems}
                </span>
                <span>Totens Saudáveis</span>
              </div>
            )}

            {summary.warning > 0 && (
              <button
                type="button"
                onClick={onFocusWarning}
                title="Focar câmera na ilha com alerta de instabilidade"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <span>
                  {summary.warning}{' '}
                  {summary.warning === 1 ? 'Instável' : 'Instáveis'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Direita: Recentralizar + Sair */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Em mobile (< md), badge compacto de alerta crítico para não perder ação rápida */}
          {summary && summary.critical > 0 && (
            <button
              type="button"
              onClick={onFocusCritical}
              aria-label={`Focar em ${summary.critical} alertas críticos`}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/50 bg-red-500/20 px-2 py-1.5 text-xs font-semibold text-red-200 md:hidden"
            >
              <XOctagon className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span className="font-mono">{summary.critical}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRecenter}
            aria-label="Recentralizar arquipélago"
            title="Recentralizar câmera"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-arcane)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-violet-400/60 hover:bg-violet-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-3"
          >
            <LocateFixed className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden="true" />
            <span className="hidden sm:inline">Recentralizar</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair"
            title="Encerrar sessão"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>
    );
  },
);

TopHud.displayName = 'TopHud';
