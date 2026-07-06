import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { Sequelize } from 'sequelize-typescript';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { CreateRewardSessionCommand } from './create-reward-session.command';

@CommandHandler(CreateRewardSessionCommand)
export class CreateRewardSessionHandler implements ICommandHandler<CreateRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: CreateRewardSessionCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
      const session = this.rewardSessionRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        startTime: command.startTime,
        endTime: command.endTime,
        totalTransactionPointAmount: 0,
        totalReceiptPointAmount: 0,
        totalTransactionAmount: 0,
        totalReceiptCount: 0,
      });
      session.create();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
