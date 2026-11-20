import { TotemStatus } from '../types/domain.types';

const STATUS_PRIORITY: Record<TotemStatus, number> = {
  [TotemStatus.CRITICAL]: 3,
  [TotemStatus.WARNING]: 2,
  [TotemStatus.UNKNOWN]: 1,
  [TotemStatus.HEALTHY]: 0,
};

/**
 * Calcula o status agregado de uma ilha pela prioridade:
 * critical > warning > unknown > healthy
 */
export function computeIslandStatus(statuses: TotemStatus[]): TotemStatus {
  if (statuses.length === 0) {
    return TotemStatus.UNKNOWN;
  }

  let worst = TotemStatus.HEALTHY;
  for (const status of statuses) {
    if (STATUS_PRIORITY[status] > STATUS_PRIORITY[worst]) {
      worst = status;
    }
  }
  return worst;
}

/**
 * Trunca mensagens de erro/resumo em no máximo 300 caracteres (spec 03, seção 5.3).
 */
export function truncateSummary(
  value: string | null | undefined,
  maxLength = 300,
): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}
