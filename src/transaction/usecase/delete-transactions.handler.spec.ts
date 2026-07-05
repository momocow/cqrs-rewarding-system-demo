import { Op } from 'sequelize';

import { DeleteTransactionsCommand } from './delete-transactions.command';
import { DeleteTransactionsHandler } from './delete-transactions.handler';

describe('DeleteTransactionsHandler', () => {
  it('destroys transactions whose clearedAt falls in the window', async () => {
    const transactionSequelize = { destroy: jest.fn(() => Promise.resolve(2)) };
    const handler = new DeleteTransactionsHandler(
      transactionSequelize as never,
    );

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteTransactionsCommand({ from, to }));

    expect(transactionSequelize.destroy).toHaveBeenCalledWith({
      where: { clearedAt: { [Op.gte]: from, [Op.lt]: to } },
    });
  });
});
