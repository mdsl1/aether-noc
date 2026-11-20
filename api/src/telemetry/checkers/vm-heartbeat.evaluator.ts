import { Injectable } from '@nestjs/common';
import { TotemStatus } from '../../common/types/domain.types';
import { truncateSummary } from '../../common/utils/telemetry.utils';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemLogMetrics } from '../../database/schemas/totem-log.schema';
import { VmMetricsDto } from '../dto/heartbeat.dto';

export interface VmEvaluationResult {
  status: TotemStatus;
  statusReason: string | null;
  metrics: TotemLogMetrics & {
    cpuLoad1m: number;
    ramUsedMb: number;
    ramTotalMb: number;
    ramUsedPercent: number;
    diskPercent: number;
    containers: Array<{ name: string; status: string }>;
  };
}

@Injectable()
export class VmHeartbeatEvaluator {
  evaluate(totem: TotemConfig, rawMetrics: VmMetricsDto): VmEvaluationResult {
    const config = totem.config ?? {};
    const expectedContainers = config.expectedContainers ?? [];
    const ramWarningPercent = config.ramWarningPercent ?? 80;
    const ramCriticalPercent = config.ramCriticalPercent ?? 90;
    const diskWarningPercent = config.diskWarningPercent ?? 80;
    const diskCriticalPercent = config.diskCriticalPercent ?? 90;

    const ramUsedPercent = Number(
      ((rawMetrics.ramUsedMb / rawMetrics.ramTotalMb) * 100).toFixed(1),
    );
    const diskPercent = rawMetrics.diskPercent;

    const normalizedContainers = rawMetrics.containers.map((c) => ({
      name: c.name,
      status: c.status,
    }));

    const metrics: VmEvaluationResult['metrics'] = {
      cpuLoad1m: rawMetrics.cpuLoad1m,
      ramUsedMb: rawMetrics.ramUsedMb,
      ramTotalMb: rawMetrics.ramTotalMb,
      ramUsedPercent,
      diskPercent,
      containers: normalizedContainers,
    };

    // 1. Containers esperados ausentes ou não-running -> critical
    const containerMap = new Map(
      normalizedContainers.map((c) => [c.name, c.status]),
    );
    const downContainers = expectedContainers.filter(
      (name) => containerMap.get(name) !== 'running',
    );

    if (downContainers.length > 0) {
      return {
        status: TotemStatus.CRITICAL,
        statusReason: truncateSummary(
          `Container(s) fora do ar: ${downContainers.join(', ')}`,
        ),
        metrics,
      };
    }

    // 2. Recursos em nível crítico -> critical
    if (
      ramUsedPercent >= ramCriticalPercent ||
      diskPercent >= diskCriticalPercent
    ) {
      return {
        status: TotemStatus.CRITICAL,
        statusReason: truncateSummary(
          `Recurso crítico: RAM ${ramUsedPercent}% / Disco ${diskPercent}%`,
        ),
        metrics,
      };
    }

    // 3. Recursos em nível de alerta -> warning
    if (
      ramUsedPercent >= ramWarningPercent ||
      diskPercent >= diskWarningPercent
    ) {
      return {
        status: TotemStatus.WARNING,
        statusReason: truncateSummary(
          `Uso elevado: RAM ${ramUsedPercent}% / Disco ${diskPercent}%`,
        ),
        metrics,
      };
    }

    // 4. Saudável
    return {
      status: TotemStatus.HEALTHY,
      statusReason: null,
      metrics,
    };
  }

  isHeartbeatTimedOut(
    totem: TotemConfig,
    lastCheckAt: Date | null,
    now: Date = new Date(),
  ): { timedOut: boolean; timeoutMinutes: number; reason: string | null } {
    const timeoutMinutes = totem.config?.heartbeatTimeoutMinutes ?? 12;

    if (!lastCheckAt) {
      return { timedOut: false, timeoutMinutes, reason: null };
    }

    const elapsedMs = now.getTime() - lastCheckAt.getTime();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    if (elapsedMs > timeoutMs) {
      return {
        timedOut: true,
        timeoutMinutes,
        reason: truncateSummary(
          `Heartbeat timeout (> ${timeoutMinutes} min sem resposta)`,
        ),
      };
    }

    return { timedOut: false, timeoutMinutes, reason: null };
  }
}
