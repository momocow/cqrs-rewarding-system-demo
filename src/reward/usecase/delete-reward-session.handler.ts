import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Sequelize } from 'sequelize-typescript';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { DeleteRewardSessionCommand } from './delete-reward-session.command';

@CommandHandler(DeleteRewardSessionCommand)
export class DeleteRewardSessionHandler implements ICommandHandler<DeleteRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: DeleteRewardSessionCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
      await this.rewardSessionRepository.deleteById(command.sessionId);
    });
  }
}
