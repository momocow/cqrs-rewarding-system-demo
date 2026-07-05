import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { fromEvent, Observable } from 'rxjs';

import { PointType, RewardSource } from '../types';

export interface IPointRewardedPayload {
  sessionId: string;
  organizationId: string;
  pointAmount: number;
  totalPointAmount: number;
  type: PointType;
  source: RewardSource;
  eventTime: Date;
}

const POINT_REWARDED = 'point-rewarded';

/**
 * In-process bridge from CQRS point-rewarded domain events to the SSE stream.
 * Wraps a Node EventEmitter; each SSE subscriber attaches a listener via
 * `fromEvent` and detaches it on disconnect.
 */
@Injectable()
export class RewardEventsEmitter {
  private readonly emitter = new EventEmitter();

  public constructor() {
    // one listener per open SSE connection; no artificial cap for the demo
    this.emitter.setMaxListeners(0);
  }

  public emitPointRewarded(payload: IPointRewardedPayload): void {
    this.emitter.emit(POINT_REWARDED, payload);
  }

  public get pointRewarded$(): Observable<IPointRewardedPayload> {
    return fromEvent(
      this.emitter,
      POINT_REWARDED,
    ) as Observable<IPointRewardedPayload>;
  }
}
