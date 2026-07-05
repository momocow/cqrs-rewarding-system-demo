import { PointRewardedEvent } from '../domain/reward-session.event';
import { PointType, RewardSource } from '../types';
import { PointRewardedEmitterHandler } from './point-rewarded.emitter-handler';

describe('PointRewardedEmitterHandler', () => {
  it('forwards the event payload to the emitter', () => {
    const emitter = { emitPointRewarded: jest.fn() };
    const handler = new PointRewardedEmitterHandler(emitter as never);

    const event = new PointRewardedEvent({
      sessionId: 'session-1',
      organizationId: 'org-1',
      pointAmount: 300,
      totalPointAmount: 300,
      type: PointType.Rewards,
      source: RewardSource.Transaction,
    });

    handler.handle(event);

    expect(emitter.emitPointRewarded).toHaveBeenCalledWith({
      sessionId: 'session-1',
      organizationId: 'org-1',
      pointAmount: 300,
      totalPointAmount: 300,
      type: PointType.Rewards,
      source: RewardSource.Transaction,
      eventTime: event.eventTime,
    });
  });
});
