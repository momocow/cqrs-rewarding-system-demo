import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { ApplyReceiptRewardCommand } from './apply-receipt-reward.command';

@CommandHandler(ApplyReceiptRewardCommand)
export class ApplyReceiptRewardHandler implements ICommandHandler<ApplyReceiptRewardCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ApplyReceiptRewardCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.time,
      );
      session.applyReceiptReward();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
