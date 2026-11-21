import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TotemType } from '../../common/types/domain.types';
import { TotemConfig } from '../../database/schemas/island.schema';
import { TotemState } from '../../database/schemas/totem-state.schema';
import { evaluateHttpProbe } from './http-probe.helper';
import { PullChecker, PullCheckerResult } from './pull-checker.interface';

const SUPABASE_TIMEOUT_MS = 10000;

@Injectable()
export class SupabaseHealthChecker implements PullChecker {
  readonly type = TotemType.SUPABASE_HEALTH;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async check(
    totem: TotemConfig,
    state: TotemState,
  ): Promise<PullCheckerResult> {
    const config = totem.config ?? {};
    const supabaseUrl = config.supabaseUrl;
    const supabaseKeyEnvRef = config.supabaseKeyEnvRef;
    const warningLatencyMs = config.warningLatencyMs ?? 3000;

    if (!supabaseUrl || !supabaseKeyEnvRef) {
      return evaluateHttpProbe({
        statusCode: null,
        latencyMs: 0,
        isReachable: false,
        errorMessage: 'Configuração do Supabase incompleta',
        expectedStatusMin: 200,
        expectedStatusMax: 299,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    }

    const apiKey = this.configService.get<string>(supabaseKeyEnvRef);
    if (!apiKey) {
      return evaluateHttpProbe({
        statusCode: null,
        latencyMs: 0,
        isReachable: false,
        errorMessage: 'Credencial do Supabase não configurada no servidor',
        expectedStatusMin: 200,
        expectedStatusMax: 299,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    }

    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`;
    const start = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.get<unknown>(endpoint, {
          timeout: SUPABASE_TIMEOUT_MS,
          headers: {
            apikey: apiKey,
          },
          validateStatus: () => true,
        }),
      );
      const latencyMs = Date.now() - start;

      return evaluateHttpProbe({
        statusCode: response.status,
        latencyMs,
        isReachable: true,
        expectedStatusMin: 200,
        expectedStatusMax: 299,
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
        expectedStatusMin: 200,
        expectedStatusMax: 299,
        warningLatencyMs,
        previousConsecutiveFailures: state.consecutiveFailures,
      });
    }
  }
}
