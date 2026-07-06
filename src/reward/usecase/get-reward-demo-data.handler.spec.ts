import { RewardSource } from '../types';
import { GetRewardDemoDataHandler } from './get-reward-demo-data.handler';

describe('GetRewardDemoDataHandler', () => {
  it('returns per-organization sessions with point subtotals scoped to each session org', async () => {
    const organizationSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
          { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
        ]),
      ),
    };
    // one reward session per (organization, window)
    const rewardSessionSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          {
            id: 'session-org1',
            organizationId: 'org-1',
            startTime: new Date('2026-07-01T00:00:00.000Z'),
            endTime: new Date('2026-08-01T00:00:00.000Z'),
            totalTransactionAmount: 2500,
            totalReceiptCount: 4,
          },
          {
            id: 'session-org2',
            organizationId: 'org-2',
            startTime: new Date('2026-07-01T00:00:00.000Z'),
            endTime: new Date('2026-08-01T00:00:00.000Z'),
            totalTransactionAmount: 9000,
            totalReceiptCount: 11,
          },
        ]),
      ),
    };
    const pointSequelize = {
      findAll: jest.fn(() =>
        Promise.resolve([
          {
            rewardSessionId: 'session-org1',
            organizationId: 'org-1',
            source: RewardSource.Transaction,
            total: '1800',
          },
          {
            rewardSessionId: 'session-org1',
            organizationId: 'org-1',
            source: RewardSource.Receipt,
            total: '0',
          },
          {
            rewardSessionId: 'session-org2',
            organizationId: 'org-2',
            source: RewardSource.Transaction,
            total: '300',
          },
          {
            rewardSessionId: 'session-org2',
            organizationId: 'org-2',
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
      { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
    ]);
    expect(result.sessions).toHaveLength(2);

    const org1Session = result.sessions.find((s) => s.id === 'session-org1');
    expect(org1Session).toMatchObject({
      organizationId: 'org-1',
      totalTransactionAmount: 2500,
      totalReceiptCount: 4,
      totalTransactionPointAmount: 1800,
      totalReceiptPointAmount: 0,
    });

    const org2Session = result.sessions.find((s) => s.id === 'session-org2');
    expect(org2Session).toMatchObject({
      organizationId: 'org-2',
      totalTransactionAmount: 9000,
      totalReceiptCount: 11,
      totalTransactionPointAmount: 300,
      totalReceiptPointAmount: 100,
    });

    expect(org1Session?.transactionRewardPolicies).toEqual([
      { threshold: 0.2, points: 300 },
      { threshold: 0.4, points: 600 },
      { threshold: 0.6, points: 900 },
    ]);
    expect(org1Session?.receiptRewardPolicies).toEqual([
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
              organizationId: 'org-1',
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
      organizationId: 'org-1',
      totalTransactionPointAmount: 0,
      totalReceiptPointAmount: 0,
    });
  });
});
