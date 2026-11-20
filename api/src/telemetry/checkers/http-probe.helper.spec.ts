import { TotemStatus } from '../../common/types/domain.types';
import { evaluateHttpProbe } from './http-probe.helper';

describe('evaluateHttpProbe', () => {
  const base = {
    expectedStatusMin: 200,
    expectedStatusMax: 299,
    warningLatencyMs: 3000,
  };

  it('retorna healthy e zera consecutiveFailures em HTTP 200 rápido', () => {
    const res = evaluateHttpProbe({
      ...base,
      statusCode: 200,
      latencyMs: 180,
      isReachable: true,
      previousConsecutiveFailures: 2,
    });

    expect(res.status).toBe(TotemStatus.HEALTHY);
    expect(res.statusReason).toBeNull();
    expect(res.consecutiveFailures).toBe(0);
  });

  it('retorna warning em HTTP 200 com latência >= 3000ms', () => {
    const res = evaluateHttpProbe({
      ...base,
      statusCode: 200,
      latencyMs: 3420,
      isReachable: true,
      previousConsecutiveFailures: 1,
    });

    expect(res.status).toBe(TotemStatus.WARNING);
    expect(res.statusReason).toBe('Latência elevada (3420ms)');
    expect(res.consecutiveFailures).toBe(0);
  });

  it('aplica anti-flapping: 1ª falha -> warning, 2ª falha -> critical', () => {
    const first = evaluateHttpProbe({
      ...base,
      statusCode: 503,
      latencyMs: 500,
      isReachable: true,
      previousConsecutiveFailures: 0,
    });

    expect(first.status).toBe(TotemStatus.WARNING);
    expect(first.consecutiveFailures).toBe(1);
    expect(first.statusReason).toContain('1/2');

    const second = evaluateHttpProbe({
      ...base,
      statusCode: null,
      latencyMs: 10000,
      isReachable: false,
      errorMessage: 'timeout of 10000ms exceeded',
      previousConsecutiveFailures: first.consecutiveFailures,
    });

    expect(second.status).toBe(TotemStatus.CRITICAL);
    expect(second.consecutiveFailures).toBe(2);
    expect(second.statusReason).toContain('Serviço indisponível');
  });
});
