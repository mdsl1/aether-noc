const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', {
  numeric: 'auto',
  style: 'short',
});

const fullDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const compactDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

function parseValidDate(isoString: string | null | undefined): Date | null {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formata timestamp UTC ISO 8601 como tempo relativo em pt-BR (ex: "há 3 min").
 */
export function formatRelativeTime(
  isoString: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  const date = parseValidDate(isoString);
  if (!date) {
    return 'Nunca verificado';
  }

  const diffSeconds = Math.round((date.getTime() - nowMs) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 15) {
    return 'agora';
  }

  if (absSeconds < 60) {
    return relativeTimeFormatter
      .format(diffSeconds, 'second')
      .replace(/\.$/, '');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter
      .format(diffMinutes, 'minute')
      .replace(/\.$/, '');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter
      .format(diffHours, 'hour')
      .replace(/\.$/, '');
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, 'day').replace(/\.$/, '');
}

/**
 * Formata timestamp UTC ISO 8601 para data/hora local completa (ex: "19/11/2026 22:05:12").
 */
export function formatFullDateTime(
  isoString: string | null | undefined,
): string {
  const date = parseValidDate(isoString);
  if (!date) {
    return 'Sem registro';
  }
  return fullDateTimeFormatter.format(date).replace(', ', ' ');
}

/**
 * Formata timestamp UTC ISO 8601 de forma compacta para linhas de histórico (ex: "19/11 22:05:12").
 */
export function formatCompactDateTime(
  isoString: string | null | undefined,
): string {
  const date = parseValidDate(isoString);
  if (!date) {
    return '—';
  }
  return compactDateTimeFormatter.format(date).replace(', ', ' ');
}

/**
 * Formata duração em milissegundos (ex: "142 ms" ou "1.4s").
 */
export function formatDurationMs(
  durationMs: number | null | undefined,
): string {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) {
    return '—';
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatMemoryMb(megabytes: number | undefined): string {
  if (typeof megabytes !== 'number' || Number.isNaN(megabytes)) {
    return '—';
  }
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(megabytes)} MB`;
}
