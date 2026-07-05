import { Op } from 'sequelize';

import { DeleteReceiptsCommand } from './delete-receipts.command';
import { DeleteReceiptsHandler } from './delete-receipts.handler';

describe('DeleteReceiptsHandler', () => {
  it('destroys receipts whose createdAt falls in the window', async () => {
    const receiptSequelize = { destroy: jest.fn(() => Promise.resolve(1)) };
    const handler = new DeleteReceiptsHandler(receiptSequelize as never);

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteReceiptsCommand({ from, to }));

    expect(receiptSequelize.destroy).toHaveBeenCalledWith({
      where: { createdAt: { [Op.gte]: from, [Op.lt]: to } },
    });
  });
});
