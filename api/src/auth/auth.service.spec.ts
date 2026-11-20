import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('super-secret', 4);
  });

  beforeEach(() => {
    const env: Record<string, string> = {
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD_HASH: passwordHash,
      JWT_EXPIRES_IN: '7d',
    };

    const configService = {
      getOrThrow: jest.fn((key: string) => env[key]),
      get: jest.fn(
        (key: string, defaultValue?: string) => env[key] ?? defaultValue,
      ),
    } as unknown as ConfigService;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };

    service = new AuthService(
      configService,
      jwtService as unknown as JwtService,
    );
  });

  it('returns accessToken for valid credentials', async () => {
    const result = await service.login({
      username: 'admin',
      password: 'super-secret',
    });

    expect(result).toEqual({
      accessToken: 'signed-jwt-token',
      tokenType: 'Bearer',
      expiresIn: '7d',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'admin',
      role: 'admin',
    });
  });

  it('throws UnauthorizedException for invalid password', async () => {
    await expect(
      service.login({ username: 'admin', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for invalid username', async () => {
    await expect(
      service.login({ username: 'hacker', password: 'super-secret' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
