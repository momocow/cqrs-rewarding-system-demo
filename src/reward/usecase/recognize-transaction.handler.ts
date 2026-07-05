import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Sequelize } from 'sequelize-typescript';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RecognizeTransactionCommand } from './recognize-transaction.command';

@CommandHandler(RecognizeTransactionCommand)
export class RecognizeTransactionHandler implements ICommandHandler<RecognizeTransactionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: RecognizeTransactionCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.transaction.clearedTime,
      );
      session.recognizeTransaction(command.transaction);
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
