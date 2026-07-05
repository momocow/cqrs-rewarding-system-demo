import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Sequelize } from 'sequelize-typescript';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RecognizeReceiptCommand } from './recognize-receipt.command';

@CommandHandler(RecognizeReceiptCommand)
export class RecognizeReceiptHandler implements ICommandHandler<RecognizeReceiptCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: RecognizeReceiptCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
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
