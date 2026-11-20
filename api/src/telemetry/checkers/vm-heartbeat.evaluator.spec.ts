import {
  IconKey,
  TotemStatus,
  TotemType,
} from '../../common/types/domain.types';
import { TotemConfig } from '../../database/schemas/island.schema';
import { VmHeartbeatEvaluator } from './vm-heartbeat.evaluator';

describe('VmHeartbeatEvaluator', () => {
  const evaluator = new VmHeartbeatEvaluator();

  const vmTotem: TotemConfig = {
    totemId: 'core-vm',
    name: 'VM Principal',
    type: TotemType.VM_HEARTBEAT,
    iconKey: IconKey.SERVER,
    checkIntervalMinutes: 3,
    enabled: true,
    config: {
      expectedContainers: ['n8n', 'portfolio-api'],
      heartbeatTimeoutMinutes: 12,
      ramWarningPercent: 80,
      ramCriticalPercent: 90,
      diskWarningPercent: 80,
      diskCriticalPercent: 90,
    },
  };

  it('retorna healthy quando containers e recursos estão normais', () => {
    const result = evaluator.evaluate(vmTotem, {
      cpuLoad1m: 0.42,
      ramUsedMb: 1450,
      ramTotalMb: 4096,
      diskPercent: 48,
      containers: [
        { name: 'n8n', status: 'running' },
        { name: 'portfolio-api', status: 'running' },
      ],
    });

    expect(result.status).toBe(TotemStatus.HEALTHY);
    expect(result.statusReason).toBeNull();
    expect(result.metrics.ramUsedPercent).toBe(35.4);
  });

  it('retorna critical se algum container esperado estiver ausente ou parado', () => {
    const result = evaluator.evaluate(vmTotem, {
      cpuLoad1m: 0.2,
      ramUsedMb: 1000,
      ramTotalMb: 4096,
      diskPercent: 30,
      containers: [{ name: 'n8n', status: 'exited' }],
    });

    expect(result.status).toBe(TotemStatus.CRITICAL);
    expect(result.statusReason).toContain('n8n');
    expect(result.statusReason).toContain('portfolio-api');
  });

  it('retorna warning quando RAM ou Disco >= 80% e < 90%', () => {
    const result = evaluator.evaluate(vmTotem, {
      cpuLoad1m: 1.2,
      ramUsedMb: 3400,
      ramTotalMb: 4096,
      diskPercent: 50,
      containers: [
        { name: 'n8n', status: 'running' },
        { name: 'portfolio-api', status: 'running' },
      ],
    });

    expect(result.status).toBe(TotemStatus.WARNING);
    expect(result.statusReason).toContain('Uso elevado');
  });

  it('retorna critical quando RAM ou Disco >= 90%', () => {
    const result = evaluator.evaluate(vmTotem, {
      cpuLoad1m: 2.0,
      ramUsedMb: 1000,
      ramTotalMb: 4096,
      diskPercent: 92,
      containers: [
        { name: 'n8n', status: 'running' },
        { name: 'portfolio-api', status: 'running' },
      ],
    });

    expect(result.status).toBe(TotemStatus.CRITICAL);
    expect(result.statusReason).toContain('Recurso crítico');
  });

  it('detecta timeout do Dead Mans Switch após > 12 minutos', () => {
    const now = new Date('2026-11-20T12:20:00.000Z');
    const recent = new Date('2026-11-20T12:10:00.000Z');
    const stale = new Date('2026-11-20T12:07:00.000Z');

    expect(evaluator.isHeartbeatTimedOut(vmTotem, null, now).timedOut).toBe(
      false,
    );
    expect(evaluator.isHeartbeatTimedOut(vmTotem, recent, now).timedOut).toBe(
      false,
    );

    const timedOut = evaluator.isHeartbeatTimedOut(vmTotem, stale, now);
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.reason).toBe('Heartbeat timeout (> 12 min sem resposta)');
  });
});
