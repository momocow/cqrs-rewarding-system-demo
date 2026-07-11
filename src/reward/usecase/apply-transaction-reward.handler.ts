import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { ApplyTransactionRewardCommand } from './apply-transaction-reward.command';

@CommandHandler(ApplyTransactionRewardCommand)
export class ApplyTransactionRewardHandler implements ICommandHandler<ApplyTransactionRewardCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ApplyTransactionRewardCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
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
