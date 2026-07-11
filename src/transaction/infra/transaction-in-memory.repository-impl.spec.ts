import { TransactionType } from '../types';
import { TransactionInMemoryRepositoryImpl } from './transaction-in-memory.repository-impl';

const makeRepo = () => {
  const repo = new TransactionInMemoryRepositoryImpl({
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

const makeTx = (id: string, clearedAt: Date) => ({
  id,
  organizationId: 'org-1',
  cardId: 'card-1',
  amount: 100,
  type: TransactionType.Spend,
  merchant: 'Acme',
  clearedAt,
});

describe('TransactionInMemoryRepositoryImpl', () => {
  it('saves a transaction and finds it by id', async () => {
    const repo = makeRepo();
    await repo.save(
      repo.build(makeTx('t1', new Date('2026-07-10T00:00:00.000Z'))),
    );

    const found = await repo.findOneById('t1');
    expect(found.toJSON().root.id).toBe('t1');
  });

  it('deletes only transactions cleared within [from, to)', async () => {
    const repo = makeRepo();
    await repo.save(
      repo.build(makeTx('in', new Date('2026-07-10T00:00:00.000Z'))),
    );
    await repo.save(
      repo.build(makeTx('out', new Date('2026-08-10T00:00:00.000Z'))),
    );

    await repo.deleteByClearedWindow(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
    );

    await expect(repo.findOneById('in')).rejects.toThrow('not found');
    expect((await repo.findOneById('out')).toJSON().root.id).toBe('out');
  });
});
