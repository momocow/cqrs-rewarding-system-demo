import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';

import { ReceiptSequelize } from '../infra/receipt.sequelize';
import { DeleteReceiptsCommand } from './delete-receipts.command';

@CommandHandler(DeleteReceiptsCommand)
export class DeleteReceiptsHandler implements ICommandHandler<DeleteReceiptsCommand> {
  public constructor(
    @InjectModel(ReceiptSequelize)
    private readonly receiptSequelize: typeof ReceiptSequelize,
  ) {}

  public async execute(command: DeleteReceiptsCommand): Promise<void> {
    // createdAt is a Sequelize-managed timestamp, not in the typed attributes
    await this.receiptSequelize.destroy({
      where: {
        createdAt: { [Op.gte]: command.from, [Op.lt]: command.to },
      } as WhereOptions,
    });
  }
}
