import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let getCurrentTokenVersionMock: jest.Mock<Promise<number>, []>;

  beforeEach(() => {
    const env: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret-with-at-least-32-chars',
      ADMIN_USERNAME: 'admin',
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    getCurrentTokenVersionMock = jest
      .fn<Promise<number>, []>()
      .mockResolvedValue(2);
    const authService = {
      getCurrentTokenVersion: getCurrentTokenVersionMock,
    } as unknown as AuthService;

    strategy = new JwtStrategy(configService, authService);
  });

  it('aceita payload válido com sub, role e versão atual', async () => {
    const payload: JwtPayload = { sub: 'admin', role: 'admin', ver: 2 };
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('rejeita token cujo sub não corresponde ao ADMIN_USERNAME', async () => {
    await expect(
      strategy.validate({ sub: 'outro-usuario', role: 'admin', ver: 2 }),
    ).rejects.toThrow(UnauthorizedException);
    expect(getCurrentTokenVersionMock).not.toHaveBeenCalled();
  });

  it('rejeita token cujo role não é admin', async () => {
    await expect(
      strategy.validate({
        sub: 'admin',
        role: 'viewer' as unknown as 'admin',
        ver: 2,
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(getCurrentTokenVersionMock).not.toHaveBeenCalled();
  });

  it('rejeita token com versão desatualizada após logout global', async () => {
    await expect(
      strategy.validate({ sub: 'admin', role: 'admin', ver: 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
