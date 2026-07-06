import { TransactionType } from '@/transaction/types';

import { IReceipt, ITransaction, PointType, RewardSource } from '../types';
import { IOrganizationEntity } from './organization.entity';
import { RewardSessionAggregate } from './reward-session.aggregate';
import { IRewardSessionEntity } from './reward-session.entity';
import {
  PointRewardedEvent,
  ReceiptRecognizedEvent,
  RewardSessionCreatedEvent,
  TransactionRecognizedEvent,
} from './reward-session.event';

const spend = (amount: number): ITransaction => ({
  id: 'txn-1',
  amount,
  clearedTime: new Date('2026-07-15T00:00:00.000Z'),
  type: TransactionType.Spend,
});
// Refund amounts are stored negative; callers pass the refunded magnitude.
const refund = (amount: number): ITransaction => ({
  ...spend(-Math.abs(amount)),
  type: TransactionType.Refund,
});

const receipt: IReceipt = { id: 'receipt-1', content: 'a coffee receipt' };
const organization: IOrganizationEntity = { id: 'org-1', creditLimit: 1000 };

function buildSession(
  overrides: Partial<IRewardSessionEntity> = {},
): IRewardSessionEntity {
  return {
    id: 'session-1',
    organizationId: 'org-1',
    totalTransactionPointAmount: 0,
    totalReceiptPointAmount: 0,
    totalTransactionAmount: 0,
    totalReceiptCount: 0,
    startTime: new Date('2026-07-01T00:00:00.000Z'),
    endTime: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('RewardSessionAggregate', () => {
  it('emits a single RewardSessionCreatedEvent when created (no organization required)', () => {
    const startTime = new Date('2026-07-01T00:00:00.000Z');
    const endTime = new Date('2026-08-01T00:00:00.000Z');

    const aggregate = new RewardSessionAggregate(
      buildSession({ startTime, endTime }),
    );

    aggregate.create();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);

    const [event] = events;
    expect(event).toBeInstanceOf(RewardSessionCreatedEvent);
    expect(event).toMatchObject({ sessionId: 'session-1', startTime, endTime });
  });

  describe('recognizeTransaction', () => {
    it('increases the total for a spend and emits the new total', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalTransactionAmount: 1000 }),
        organization,
      );

      aggregate.recognizeTransaction(spend(500));

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TransactionRecognizedEvent);
      expect(events[0]).toMatchObject({ totalTransactionAmount: 1500 });
    });

    it('decreases the total for a refund', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalTransactionAmount: 1000 }),
        organization,
      );

      aggregate.recognizeTransaction(refund(300));

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ totalTransactionAmount: 700 });
    });

    it('clamps the total at 0 when a refund exceeds prior spend', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalTransactionAmount: 300 }),
        organization,
      );

      aggregate.recognizeTransaction(refund(500));

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ totalTransactionAmount: 0 });
    });
  });

  describe('recognizeReceipt', () => {
    it('increments the receipt count and emits a ReceiptRecognizedEvent', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalReceiptCount: 4 }),
        organization,
      );

      aggregate.recognizeReceipt(receipt);

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);

      const [event] = events;
      expect(event).toBeInstanceOf(ReceiptRecognizedEvent);
      expect(event).toMatchObject({
        sessionId: 'session-1',
        organizationId: 'org-1',
        receipt,
        totalReceiptCount: 5,
      });
    });
  });

  describe('applyReceiptReward', () => {
    it('emits no event below the receipt threshold', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalReceiptCount: 9 }),
        organization,
      );

      aggregate.applyReceiptReward();

      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });

    it('rewards 100 receipt points at the threshold', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalReceiptCount: 10 }),
        organization,
      );

      aggregate.applyReceiptReward();

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);

      const [event] = events;
      expect(event).toBeInstanceOf(PointRewardedEvent);
      expect(event).toMatchObject({
        sessionId: 'session-1',
        organizationId: 'org-1',
        pointAmount: 100,
        type: PointType.Rewards,
        source: RewardSource.Receipt,
      });
    });

    it('is idempotent once the reward has been granted', () => {
      const aggregate = new RewardSessionAggregate(
        buildSession({ totalReceiptCount: 10, totalReceiptPointAmount: 100 }),
        organization,
      );

      aggregate.applyReceiptReward();

      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });
});
