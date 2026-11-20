import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { TotemType } from '../../common/types/domain.types';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemState } from '../../database/schemas/totem-state.schema';
import { evaluateHttpProbe } from './http-probe.helper';
import { PullChecker, PullCheckerResult } from './pull-checker.interface';

const HTTP_PING_TIMEOUT_MS = 10000;

@Injectable()
export class HttpPingChecker implements PullChecker {
  readonly type = TotemType.HTTP_PING;

  constructor(private readonly httpService: HttpService) {}

  async check(
    totem: TotemConfig,
    state: TotemState,
  ): Promise<PullCheckerResult> {
    const config = totem.config ?? {};
    const targetUrl = config.targetUrl;
    const expectedStatusMin = config.expectedStatusMin ?? 200;
    const expectedStatusMax = config.expectedStatusMax ?? 299;
    const warningLatencyMs = config.warningLatencyMs ?? 3000;

    if (!targetUrl) {
      return evaluateHttpProbe({
        statusCode: null,
        latencyMs: 0,
        isReachable: false,
        errorMessage: 'targetUrl não configurada',
        expectedStatusMin,
        expectedStatusMax,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    }

    const start = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.get<unknown>(targetUrl, {
          timeout: HTTP_PING_TIMEOUT_MS,
          validateStatus: () => true,
        }),
      );
      const latencyMs = Date.now() - start;

      return evaluateHttpProbe({
        statusCode: response.status,
        latencyMs,
        isReachable: true,
        expectedStatusMin,
        expectedStatusMax,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const errorMessage =
        error instanceof Error ? error.message : 'Timeout ou erro de rede';

      return evaluateHttpProbe({
        statusCode: null,
        latencyMs,
        isReachable: false,
        errorMessage,
        expectedStatusMin,
        expectedStatusMax,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    }
  }
}
