import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { CreateRewardSessionCommand } from './create-reward-session.command';

@CommandHandler(CreateRewardSessionCommand)
export class CreateRewardSessionHandler implements ICommandHandler<CreateRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateRewardSessionCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
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
