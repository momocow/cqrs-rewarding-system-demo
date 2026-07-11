import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';
import { RewardQueryInMemoryRepositoryImpl } from './reward-query-in-memory.repository-impl';

describe('RewardQueryInMemoryRepositoryImpl', () => {
  it('returns seeded organizations and sessions with point subtotals, newest first', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = new RewardQueryInMemoryRepositoryImpl(store);

    const { organizations, sessions } = await repo.getDemoData();

    expect(organizations).toHaveLength(2);
    expect(organizations.map((o) => o.name)).toContain('Acme Inc');

    // sessions sorted by startTime DESC
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i - 1].startTime.getTime()).toBeGreaterThanOrEqual(
        sessions[i].startTime.getTime(),
      );
    }

    // Globex third window (22000/50000 = 0.44 -> 300+600 = 900 transaction pts;
    // 11 receipts -> 100 receipt pts)
    const globexNewest = sessions.find(
      (s) => s.id === 'b3b3b3b3-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    );
    expect(globexNewest?.totalTransactionPointAmount).toBe(900);
    expect(globexNewest?.totalReceiptPointAmount).toBe(100);
  });

  it('reports zero subtotals for a session with no points', async () => {
    const store = new RewardInMemoryStore();
    store.organizations.set('org-1', {
      id: 'org-1',
      name: 'X',
      creditLimit: 1,
    });
    store.sessions.set('s1', {
      id: 's1',
      organizationId: 'org-1',
      startTime: new Date('2026-06-01T00:00:00.000Z'),
      endTime: new Date('2026-07-01T00:00:00.000Z'),
      totalTransactionAmount: 0,
      totalReceiptCount: 0,
    });
    const repo = new RewardQueryInMemoryRepositoryImpl(store);

    const { sessions } = await repo.getDemoData();

    expect(sessions[0].totalTransactionPointAmount).toBe(0);
    expect(sessions[0].totalReceiptPointAmount).toBe(0);
  });
});
