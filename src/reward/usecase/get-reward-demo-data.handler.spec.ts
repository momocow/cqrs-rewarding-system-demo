import { RewardSource } from '../types';
import { GetRewardDemoDataHandler } from './get-reward-demo-data.handler';

describe('GetRewardDemoDataHandler', () => {
  it('returns organizations and sessions with policies and point subtotals', async () => {
    const organizationSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
        ]),
      ),
    };
    const rewardSessionSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          {
            id: 'session-1',
            startTime: new Date('2026-07-01T00:00:00.000Z'),
            endTime: new Date('2026-08-01T00:00:00.000Z'),
            totalTransactionAmount: 2500,
            totalReceiptCount: 4,
          },
        ]),
      ),
    };
    const pointSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          {
            rewardSessionId: 'session-1',
            source: RewardSource.Transaction,
            total: '1800',
          },
          {
            rewardSessionId: 'session-1',
            source: RewardSource.Receipt,
            total: '100',
          },
        ]),
      ),
    };

    const handler = new GetRewardDemoDataHandler(
      organizationSequelize as never,
      rewardSessionSequelize as never,
      pointSequelize as never,
    );

    const result = await handler.execute();

    expect(result.organizations).toEqual([
      { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
    ]);
    expect(result.sessions).toHaveLength(1);

    const [session] = result.sessions;
    expect(session).toMatchObject({
      id: 'session-1',
      totalTransactionAmount: 2500,
      totalReceiptCount: 4,
      totalTransactionPointAmount: 1800,
      totalReceiptPointAmount: 100,
    });
    expect(session.transactionRewardPolicies).toEqual([
      { threshold: 0.2, points: 300 },
      { threshold: 0.4, points: 600 },
      { threshold: 0.6, points: 900 },
    ]);
    expect(session.receiptRewardPolicies).toEqual([
      { threshold: 10, points: 100 },
    ]);
    // sessions ordered by start_time, newest first
    expect(rewardSessionSequelize.findAll).toHaveBeenCalledWith({
      order: [['startTime', 'DESC']],
    });
  });

  it('defaults point subtotals to 0 when a session has no points', async () => {
    const handler = new GetRewardDemoDataHandler(
      { findAll: jest.fn(() => Promise.resolve([])) } as never,
      {
        findAll: jest.fn(() =>
          Promise.resolve([
            {
              id: 'session-2',
              startTime: new Date('2026-06-01T00:00:00.000Z'),
              endTime: new Date('2026-07-01T00:00:00.000Z'),
              totalTransactionAmount: 0,
              totalReceiptCount: 0,
            },
          ]),
        ),
      } as never,
      { findAll: jest.fn(() => Promise.resolve([])) } as never,
    );

    const result = await handler.execute();

    expect(result.sessions[0]).toMatchObject({
      totalTransactionPointAmount: 0,
      totalReceiptPointAmount: 0,
    });
  });
});
