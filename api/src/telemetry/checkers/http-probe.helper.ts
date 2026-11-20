import { TotemStatus } from '../../common/types/domain.types';
import { truncateSummary } from '../../common/utils/telemetry.utils';
import { PullCheckerResult } from './pull-checker.interface';

export interface HttpProbeInput {
  statusCode: number | null;
  latencyMs: number;
  isReachable: boolean;
  errorMessage?: string;
  expectedStatusMin: number;
  expectedStatusMax: number;
  warningLatencyMs: number;
  previousConsecutiveFailures: number;
  checkedAt?: Date;
}

/**
 * Avalia o resultado de uma sonda HTTP (`http_ping` ou `supabase_health`)
 * aplicando a regra de anti-flapping (2 falhas consecutivas para `critical`).
 */
export function evaluateHttpProbe(input: HttpProbeInput): PullCheckerResult {
  const timestamp = input.checkedAt ?? new Date();
  const {
    statusCode,
    latencyMs,
    isReachable,
    errorMessage,
    expectedStatusMin,
    expectedStatusMax,
    warningLatencyMs,
    previousConsecutiveFailures,
  } = input;

  const isSuccessStatus =
    isReachable &&
    statusCode !== null &&
    statusCode >= expectedStatusMin &&
    statusCode <= expectedStatusMax;

  const metrics = {
    statusCode,
    latencyMs,
    isReachable,
  };

  if (isSuccessStatus) {
    if (latencyMs >= warningLatencyMs) {
      const reason = truncateSummary(`Latência elevada (${latencyMs}ms)`);
      return {
        status: TotemStatus.WARNING,
        statusReason: reason,
        consecutiveFailures: 0,
        lastMetrics: metrics,
        logsToInsert: [
          {
            status: TotemStatus.WARNING,
            timestamp,
            summary: reason,
            metrics,
          },
        ],
      };
    }

    return {
      status: TotemStatus.HEALTHY,
      statusReason: null,
      consecutiveFailures: 0,
      lastMetrics: metrics,
      logsToInsert: [
        {
          status: TotemStatus.HEALTHY,
          timestamp,
          summary: null,
          metrics,
        },
      ],
    };
  }

  const consecutiveFailures = previousConsecutiveFailures + 1;
  const detail =
    statusCode !== null
      ? `HTTP ${statusCode}`
      : (errorMessage ?? 'Erro de rede');

  if (consecutiveFailures === 1) {
    const reason = truncateSummary(`Falha temporária (${detail}) — 1/2`);
    return {
      status: TotemStatus.WARNING,
      statusReason: reason,
      consecutiveFailures,
      lastMetrics: metrics,
      logsToInsert: [
        {
          status: TotemStatus.WARNING,
          timestamp,
          summary: reason,
          metrics,
        },
      ],
    };
  }

  const reason = truncateSummary(`Serviço indisponível (${detail})`);
  return {
    status: TotemStatus.CRITICAL,
    statusReason: reason,
    consecutiveFailures,
    lastMetrics: metrics,
    logsToInsert: [
      {
        status: TotemStatus.CRITICAL,
        timestamp,
        summary: reason,
        metrics,
      },
    ],
  };
}
