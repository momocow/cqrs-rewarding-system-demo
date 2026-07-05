import { DeleteRewardSessionCommand } from './delete-reward-session.command';
import { DeleteRewardSessionHandler } from './delete-reward-session.handler';

describe('DeleteRewardSessionHandler', () => {
  it('deletes the session (and its points) inside a transaction', async () => {
    const repository = { deleteById: jest.fn(() => Promise.resolve()) };
    const sequelize = {
      transaction: jest.fn((cb: () => Promise<unknown>) => cb()),
    };

    const handler = new DeleteRewardSessionHandler(
      repository as never,
      sequelize as never,
    );

    await handler.execute(
      new DeleteRewardSessionCommand({ sessionId: 'session-1' }),
    );

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(repository.deleteById).toHaveBeenCalledWith('session-1');
  });
});
