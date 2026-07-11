import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RecognizeReceiptCommand } from './recognize-receipt.command';

@CommandHandler(RecognizeReceiptCommand)
export class RecognizeReceiptHandler implements ICommandHandler<RecognizeReceiptCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: RecognizeReceiptCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.time,
      );
      session.recognizeReceipt(command.receipt);
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
