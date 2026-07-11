import { DeleteReceiptsCommand } from './delete-receipts.command';
import { DeleteReceiptsHandler } from './delete-receipts.handler';

describe('DeleteReceiptsHandler', () => {
  it('delegates to the repository window delete', async () => {
    const receiptRepository = {
      deleteByCreatedWindow: jest.fn(() => Promise.resolve()),
    };
    const handler = new DeleteReceiptsHandler(receiptRepository as never);

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteReceiptsCommand({ from, to }));

    expect(receiptRepository.deleteByCreatedWindow).toHaveBeenCalledWith(
      from,
      to,
    );
  });
});
