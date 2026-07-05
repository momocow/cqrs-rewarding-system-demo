import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { PointRewardedEvent } from '../domain/reward-session.event';
import { RewardEventsEmitter } from './reward-events.emitter';

/**
 * Forwards each CQRS PointRewardedEvent to the in-process emitter that backs the
 * SSE stream.
 */
@EventsHandler(PointRewardedEvent)
export class PointRewardedEmitterHandler implements IEventHandler<PointRewardedEvent> {
  public constructor(private readonly emitter: RewardEventsEmitter) {}

  public handle(event: PointRewardedEvent): void {
    this.emitter.emitPointRewarded({
      sessionId: event.sessionId,
      organizationId: event.organizationId,
      pointAmount: event.pointAmount,
      totalPointAmount: event.totalPointAmount,
      type: event.type,
      source: event.source,
      eventTime: event.eventTime,
    });
  }
}
