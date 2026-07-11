import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';
import { RewardSessionInMemoryRepositoryImpl } from './reward-session-in-memory.repository-impl';

const ORG_A = '11111111-1111-1111-1111-111111111111';

const makeRepo = (store: RewardInMemoryStore) => {
  const repo = new RewardSessionInMemoryRepositoryImpl(store, {
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

describe('RewardSessionInMemoryRepositoryImpl', () => {
  it('finds the active session for an org at a given time, with point subtotals', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);

    // July 2026 window is the third seeded session for ORG_A
    const session = await repo.findOneActive(
      ORG_A,
      new Date('2026-07-15T00:00:00.000Z'),
    );
    const json = session.toJSON();

    expect(json.root.id).toBe('a3a3a3a3-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(json.root.organizationId).toBe(ORG_A);
  });

  it('throws when no active session exists for the time', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);

    await expect(
      repo.findOneActive(ORG_A, new Date('2030-01-01T00:00:00.000Z')),
    ).rejects.toThrow('active reward session');
  });

  it('deletes a session and its points', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);
    const sessionId = 'a3a3a3a3-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    await repo.deleteById(sessionId);

    expect(store.sessions.has(sessionId)).toBe(false);
    expect(store.points.some((p) => p.rewardSessionId === sessionId)).toBe(
      false,
    );
  });
});
