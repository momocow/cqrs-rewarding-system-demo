import { ReceiptInMemoryRepositoryImpl } from './receipt-in-memory.repository-impl';

const makeRepo = () => {
  const repo = new ReceiptInMemoryRepositoryImpl({
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

describe('ReceiptInMemoryRepositoryImpl', () => {
  it('saves a receipt and finds it by id', async () => {
    const repo = makeRepo();
    await repo.save(
      repo.build({ id: 'r1', organizationId: 'org-1', content: 'x' }),
    );

    const found = await repo.findOneById('r1');
    expect(found.toJSON().root.id).toBe('r1');
  });

  it('deletes receipts created within [from, to)', async () => {
    const repo = makeRepo();
    await repo.save(
      repo.build({ id: 'r1', organizationId: 'org-1', content: 'x' }),
    );

    // createdAt is stamped "now" on save; a window ending in the past deletes nothing
    await repo.deleteByCreatedWindow(
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-02-01T00:00:00.000Z'),
    );
    expect((await repo.findOneById('r1')).toJSON().root.id).toBe('r1');

    // a window spanning the present deletes it
    await repo.deleteByCreatedWindow(
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2999-01-01T00:00:00.000Z'),
    );
    await expect(repo.findOneById('r1')).rejects.toThrow('not found');
  });
});
