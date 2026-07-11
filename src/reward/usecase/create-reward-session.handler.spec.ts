import { CreateRewardSessionCommand } from './create-reward-session.command';
import { CreateRewardSessionHandler } from './create-reward-session.handler';

describe('CreateRewardSessionHandler', () => {
  it('builds, creates, saves and commits in order with a generated id', async () => {
    const calls: string[] = [];

    const aggregate = {
      create: jest.fn(() => calls.push('create')),
      commit: jest.fn(() => calls.push('commit')),
    };

    let builtWith: unknown;
    const repository = {
      build: jest.fn((session: unknown) => {
        calls.push('build');
        builtWith = session;
        return aggregate;
      }),
      save: jest.fn(() => {
        calls.push('save');
        return Promise.resolve();
      }),
    };

    // mimic the unit of work by simply invoking the callback
    const unitOfWork = {
      run: jest.fn((work: () => Promise<unknown>) => work()),
    };

    const handler = new CreateRewardSessionHandler(
      repository as never,
      unitOfWork as never,
    );

    const startTime = new Date('2026-07-01T00:00:00.000Z');
    const endTime = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(
      new CreateRewardSessionCommand({
        organizationId: 'org-1',
        startTime,
        endTime,
      }),
    );

    expect(calls).toEqual(['build', 'create', 'save', 'commit']);
    expect(repository.save).toHaveBeenCalledWith(aggregate);
    expect(builtWith).toMatchObject({
      organizationId: 'org-1',
      startTime,
      endTime,
      totalTransactionPointAmount: 0,
      totalReceiptPointAmount: 0,
      totalTransactionAmount: 0,
      totalReceiptCount: 0,
    });
    expect(typeof (builtWith as { id: string }).id).toBe('string');
    expect((builtWith as { id: string }).id.length).toBeGreaterThan(0);
  });
});
