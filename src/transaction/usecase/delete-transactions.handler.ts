import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionRepository } from '../domain/transaction.repository';
import { DeleteTransactionsCommand } from './delete-transactions.command';

@CommandHandler(DeleteTransactionsCommand)
export class DeleteTransactionsHandler implements ICommandHandler<DeleteTransactionsCommand> {
  public constructor(
    private readonly transactionRepository: TransactionRepository,
  ) {}

  public async execute(command: DeleteTransactionsCommand): Promise<void> {
    await this.transactionRepository.deleteByClearedWindow(
      command.from,
      command.to,
    );
  }
}
