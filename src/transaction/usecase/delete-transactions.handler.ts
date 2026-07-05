import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';

import { TransactionSequelize } from '../infra/transaction.sequelize';
import { DeleteTransactionsCommand } from './delete-transactions.command';

@CommandHandler(DeleteTransactionsCommand)
export class DeleteTransactionsHandler implements ICommandHandler<DeleteTransactionsCommand> {
  public constructor(
    @InjectModel(TransactionSequelize)
    private readonly transactionSequelize: typeof TransactionSequelize,
  ) {}

  public async execute(command: DeleteTransactionsCommand): Promise<void> {
    await this.transactionSequelize.destroy({
      where: { clearedAt: { [Op.gte]: command.from, [Op.lt]: command.to } },
    });
  }
}
