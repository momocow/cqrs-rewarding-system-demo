import { DeleteTransactionsCommand } from './delete-transactions.command';
import { DeleteTransactionsHandler } from './delete-transactions.handler';

describe('DeleteTransactionsHandler', () => {
  it('delegates to the repository window delete', async () => {
    const transactionRepository = {
      deleteByClearedWindow: jest.fn(() => Promise.resolve()),
    };
    const handler = new DeleteTransactionsHandler(
      transactionRepository as never,
    );

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteTransactionsCommand({ from, to }));

    expect(transactionRepository.deleteByClearedWindow).toHaveBeenCalledWith(
      from,
      to,
    );
  });
});
