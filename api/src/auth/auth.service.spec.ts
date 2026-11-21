import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AUTH_LOGOUT_EVENT } from '../common/types/domain.types';
import {
  ADMIN_AUTH_STATE_KEY,
  AuthStateDocument,
} from '../database/schemas/auth-state.schema';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let findOneExecMock: jest.Mock;
  let findOneAndUpdateExecMock: jest.Mock;
  let authStateModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
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

    findOneExecMock = jest.fn().mockResolvedValue({ tokenVersion: 2 });
    findOneAndUpdateExecMock = jest.fn().mockResolvedValue({
      key: ADMIN_AUTH_STATE_KEY,
      tokenVersion: 3,
    });

    authStateModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: findOneExecMock,
          }),
        }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: findOneAndUpdateExecMock,
      }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    service = new AuthService(
      authStateModel as unknown as Model<AuthStateDocument>,
      configService,
      jwtService as unknown as JwtService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('returns accessToken with current tokenVersion for valid credentials', async () => {
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
      ver: 2,
    });
  });

  it('defaults tokenVersion to 0 when auth_state document does not exist', async () => {
    findOneExecMock.mockResolvedValueOnce(null);

    await expect(service.getCurrentTokenVersion()).resolves.toBe(0);
  });

  it('increments tokenVersion and emits auth.logout on global logout', async () => {
    const result = await service.logout();

    expect(authStateModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: ADMIN_AUTH_STATE_KEY },
      {
        $inc: { tokenVersion: 1 },
        $set: { revokedAt: expect.any(Date) as Date },
      },
      { upsert: true, new: true },
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(AUTH_LOGOUT_EVENT, {
      revokedAt: expect.any(String) as string,
    });
    expect(result.revoked).toBe(true);
    expect(result.revokedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
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
