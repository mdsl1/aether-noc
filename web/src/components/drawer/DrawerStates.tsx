import React from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import type { PaginationMeta } from '../../types/aether';

export const DrawerLogsSkeleton: React.FC<{ rows?: number }> = ({
  rows = 5,
}) => (
  <div className="space-y-2.5" aria-label="Carregando histórico">
    {Array.from({ length: rows }).map((_, idx) => (
      <div
        key={idx}
        className="animate-pulse rounded-lg border border-white/5 bg-[var(--surface-card)] p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-white/10" />
            <div className="h-3.5 w-24 rounded bg-white/10" />
          </div>
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
        <div className="mt-2.5 h-3 w-2/3 rounded bg-white/5" />
      </div>
    ))}
  </div>
);

export const DrawerEmptyState: React.FC<{ message?: string }> = ({
  message = 'Nenhum registro de histórico encontrado nos últimos dias.',
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-arcane)] bg-[var(--surface-card)]/50 px-4 py-8 text-center">
    <Inbox className="h-6 w-6 text-[var(--text-secondary)]/70" aria-hidden="true" />
    <p className="text-xs text-[var(--text-secondary)]">{message}</p>
  </div>
);

export const DrawerErrorState: React.FC<{
  error: Error | null;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-red-500/35 bg-red-500/10 p-4 text-center">
    <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
    <div>
      <p className="text-xs font-medium text-red-200">
        Não foi possível carregar o histórico.
      </p>
      {error?.message && (
        <p className="mt-1 text-[11px] text-red-200/75">{error.message}</p>
      )}
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:bg-red-500/30"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Tentar novamente</span>
    </button>
  </div>
);

export const DrawerPagination: React.FC<{
  pagination: PaginationMeta;
  isFetching: boolean;
  onPageChange: (nextPage: number) => void;
}> = ({ pagination, isFetching, onPageChange }) => {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const canPrev = pagination.page > 1 && !isFetching;
  const canNext = pagination.hasNextPage && !isFetching;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(pagination.page - 1)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border-arcane)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Anterior</span>
      </button>

      <span className="font-mono text-[11px] text-[var(--text-secondary)]">
        Página {pagination.page} de {pagination.totalPages}
      </span>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(pagination.page + 1)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border-arcane)] bg-[var(--surface-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>Próxima</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
