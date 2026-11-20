import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('valid-secret-key-123'),
    } as unknown as ConfigService;

    guard = new ApiKeyGuard(configService);
  });

  const createContext = (headers: Record<string, string | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  it('allows request with valid x-api-key', () => {
    expect(
      guard.canActivate(createContext({ 'x-api-key': 'valid-secret-key-123' })),
    ).toBe(true);
  });

  it('rejects request with missing x-api-key', () => {
    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects request with wrong x-api-key', () => {
    expect(() =>
      guard.canActivate(createContext({ 'x-api-key': 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });
});
