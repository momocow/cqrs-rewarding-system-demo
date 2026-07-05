import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { Sequelize } from 'sequelize-typescript';

import { TransactionRepository } from '../domain/transaction.repository';
import { CreateTransactionCommand } from './create-transaction.command';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<CreateTransactionCommand> {
  public constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly sequelize: Sequelize,
  ) {}

  public async execute(command: CreateTransactionCommand): Promise<void> {
    await this.sequelize.transaction(async () => {
      const transaction = this.transactionRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        cardId: command.cardId,
        amount: command.amount,
        type: command.type,
        merchant: command.merchant,
        clearedAt: command.clearedTime,
      });
      transaction.create();
      await this.transactionRepository.save(transaction);
      transaction.commit();
    });
  }
}
