import { CreateReceiptCommand } from './create-receipt.command';
import { CreateReceiptHandler } from './create-receipt.handler';

describe('CreateReceiptHandler', () => {
  it('builds, creates, saves and commits in order with a generated id', async () => {
    const calls: string[] = [];

    const aggregate = {
      create: jest.fn(() => calls.push('create')),
      commit: jest.fn(() => calls.push('commit')),
    };

    let builtWith: unknown;
    const repository = {
      build: jest.fn((receipt: unknown) => {
        calls.push('build');
        builtWith = receipt;
        return aggregate;
      }),
      save: jest.fn(() => {
        calls.push('save');
        return Promise.resolve();
      }),
    };

    // mimic sequelize.transaction(cb) by simply invoking the callback
    const sequelize = {
      transaction: jest.fn((cb: () => Promise<unknown>) => cb()),
    };

    const handler = new CreateReceiptHandler(
      repository as never,
      sequelize as never,
    );

    await handler.execute(
      new CreateReceiptCommand({
        organizationId: 'org-1',
        content: 'a coffee receipt',
      }),
    );

    expect(calls).toEqual(['build', 'create', 'save', 'commit']);
    expect(repository.save).toHaveBeenCalledWith(aggregate);
    expect(builtWith).toMatchObject({
      organizationId: 'org-1',
      content: 'a coffee receipt',
    });
    // id is server-generated (a non-empty string)
    expect(typeof (builtWith as { id: string }).id).toBe('string');
    expect((builtWith as { id: string }).id.length).toBeGreaterThan(0);
  });
});
