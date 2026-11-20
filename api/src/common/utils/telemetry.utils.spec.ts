import { TotemStatus } from '../types/domain.types';
import { computeIslandStatus, truncateSummary } from './telemetry.utils';

describe('telemetry.utils', () => {
  describe('computeIslandStatus', () => {
    it('respeita a prioridade critical > warning > unknown > healthy', () => {
      expect(
        computeIslandStatus([TotemStatus.HEALTHY, TotemStatus.HEALTHY]),
      ).toBe(TotemStatus.HEALTHY);
      expect(
        computeIslandStatus([TotemStatus.HEALTHY, TotemStatus.UNKNOWN]),
      ).toBe(TotemStatus.UNKNOWN);
      expect(
        computeIslandStatus([TotemStatus.UNKNOWN, TotemStatus.WARNING]),
      ).toBe(TotemStatus.WARNING);
      expect(
        computeIslandStatus([
          TotemStatus.HEALTHY,
          TotemStatus.WARNING,
          TotemStatus.CRITICAL,
        ]),
      ).toBe(TotemStatus.CRITICAL);
      expect(computeIslandStatus([])).toBe(TotemStatus.UNKNOWN);
    });
  });

  describe('truncateSummary', () => {
    it('trunca mensagens acima de 300 caracteres', () => {
      const longText = 'a'.repeat(400);
      const truncated = truncateSummary(longText);
      expect(truncated).not.toBeNull();
      expect(truncated?.length).toBe(300);
      expect(truncated?.endsWith('...')).toBe(true);
    });

    it('retorna null para strings vazias ou nulas', () => {
      expect(truncateSummary(null)).toBeNull();
      expect(truncateSummary('   ')).toBeNull();
    });
  });
});
