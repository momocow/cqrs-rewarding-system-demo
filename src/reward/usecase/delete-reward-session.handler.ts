import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { DeleteRewardSessionCommand } from './delete-reward-session.command';

@CommandHandler(DeleteRewardSessionCommand)
export class DeleteRewardSessionHandler implements ICommandHandler<DeleteRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: DeleteRewardSessionCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      await this.rewardSessionRepository.deleteById(command.sessionId);
    });
  }
}
