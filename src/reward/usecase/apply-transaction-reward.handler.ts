import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Sequelize } from 'sequelize-typescript';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { ApplyTransactionRewardCommand } from './apply-transaction-reward.command';

@CommandHandler(ApplyTransactionRewardCommand)
export class ApplyTransactionRewardHandler implements ICommandHandler<ApplyTransactionRewardCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: ApplyTransactionRewardCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.transaction.clearedTime,
      );
      session.applyTransactionReward();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
