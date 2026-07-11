import { DeleteRewardSessionCommand } from './delete-reward-session.command';
import { DeleteRewardSessionHandler } from './delete-reward-session.handler';

describe('DeleteRewardSessionHandler', () => {
  it('deletes the session (and its points) inside a unit of work', async () => {
    const repository = { deleteById: jest.fn(() => Promise.resolve()) };
    const unitOfWork = {
      run: jest.fn((work: () => Promise<unknown>) => work()),
    };

    const handler = new DeleteRewardSessionHandler(
      repository as never,
      unitOfWork as never,
    );

    await handler.execute(
      new DeleteRewardSessionCommand({ sessionId: 'session-1' }),
    );

    expect(unitOfWork.run).toHaveBeenCalled();
    expect(repository.deleteById).toHaveBeenCalledWith('session-1');
  });
});
