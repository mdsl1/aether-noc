import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { map, merge, Observable, Subject, takeUntil, timer } from 'rxjs';
import {
  AUTH_LOGOUT_EVENT,
  TOTEM_UPDATED_EVENT,
  TotemStatus,
} from '../common/types/domain.types';
import type { TotemUpdatedEvent } from '../common/types/domain.types';

export const SSE_PING_INTERVAL_MS = 25_000;

export interface TotemUpdatedSsePayload {
  islandSlug: string;
  islandStatus: TotemStatus;
  totem: {
    totemId: string;
    status: TotemStatus;
    statusReason: string | null;
    lastCheckAt: string | null;
    lastStatusChangeAt: string | null;
    lastMetrics: Record<string, unknown> | null;
  };
}

@Injectable()
export class StreamService implements OnModuleDestroy {
  private readonly updates$ = new Subject<TotemUpdatedSsePayload>();
  private readonly destroy$ = new Subject<void>();
  private readonly sessionRevoked$ = new Subject<void>();

  @OnEvent(TOTEM_UPDATED_EVENT)
  handleTotemUpdated(event: TotemUpdatedEvent): void {
    const payload: TotemUpdatedSsePayload = {
      islandSlug: event.islandSlug,
      islandStatus: event.islandStatus,
      totem: {
        totemId: event.totem.totemId,
        status: event.totem.status,
        statusReason: event.totem.statusReason,
        lastCheckAt: event.totem.lastCheckAt,
        lastStatusChangeAt: event.totem.lastStatusChangeAt,
        lastMetrics: event.totem.lastMetrics,
      },
    };

    this.updates$.next(payload);
  }

  @OnEvent(AUTH_LOGOUT_EVENT)
  handleAuthLogout(): void {
    this.sessionRevoked$.next();
  }

  createStream(
    pingIntervalMs: number = SSE_PING_INTERVAL_MS,
  ): Observable<MessageEvent> {
    const totemEvents$: Observable<MessageEvent> = this.updates$.pipe(
      map((data) => ({
        type: TOTEM_UPDATED_EVENT,
        data,
      })),
    );

    const pingEvents$: Observable<MessageEvent> = timer(0, pingIntervalMs).pipe(
      map(() => ({
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      })),
    );

    return merge(totemEvents$, pingEvents$).pipe(
      takeUntil(merge(this.destroy$, this.sessionRevoked$)),
    );
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sessionRevoked$.complete();
    this.updates$.complete();
  }
}
