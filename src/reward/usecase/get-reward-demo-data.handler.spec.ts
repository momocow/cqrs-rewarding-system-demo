import { GetRewardDemoDataHandler } from './get-reward-demo-data.handler';

describe('GetRewardDemoDataHandler', () => {
  it('returns the read model enriched with default reward policies', async () => {
    const rewardQueryRepository = {
      getDemoData: jest.fn(() =>
        Promise.resolve({
          organizations: [
            { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
            { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
          ],
          sessions: [
            {
              id: 'session-org1',
              organizationId: 'org-1',
              startTime: new Date('2026-07-01T00:00:00.000Z'),
              endTime: new Date('2026-08-01T00:00:00.000Z'),
              totalTransactionAmount: 2500,
              totalReceiptCount: 4,
              totalTransactionPointAmount: 1800,
              totalReceiptPointAmount: 0,
            },
          ],
        }),
      ),
    };

    const handler = new GetRewardDemoDataHandler(rewardQueryRepository);
    const result = await handler.execute();

    expect(result.organizations).toEqual([
      { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
      { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
    ]);
    expect(result.sessions[0]).toMatchObject({
      organizationId: 'org-1',
      totalTransactionAmount: 2500,
      totalTransactionPointAmount: 1800,
    });
    expect(result.sessions[0].transactionRewardPolicies).toEqual([
      { threshold: 0.2, points: 300 },
      { threshold: 0.4, points: 600 },
      { threshold: 0.6, points: 900 },
    ]);
    expect(result.sessions[0].receiptRewardPolicies).toEqual([
      { threshold: 10, points: 100 },
    ]);
  });
});
