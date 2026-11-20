import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Connection, ConnectionStates } from 'mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const createMockResponse = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return {
      res: { status } as unknown as Response,
      status,
      json,
    };
  };

  it('returns 200 OK when MongoDB is connected', () => {
    const connection = {
      readyState: ConnectionStates.connected,
    } as unknown as Connection;
    const controller = new HealthController(connection);
    const { res, status, json } = createMockResponse();

    controller.check(res);

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
      }),
    );
  });

  it('returns 503 Service Unavailable when MongoDB is disconnected', () => {
    const connection = {
      readyState: ConnectionStates.disconnected,
    } as unknown as Connection;
    const controller = new HealthController(connection);
    const { res, status, json } = createMockResponse();

    controller.check(res);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        database: 'disconnected',
      }),
    );
  });
});
