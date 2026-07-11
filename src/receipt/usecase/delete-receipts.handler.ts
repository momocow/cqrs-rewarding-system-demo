import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ReceiptRepository } from '../domain/receipt.repository';
import { DeleteReceiptsCommand } from './delete-receipts.command';

@CommandHandler(DeleteReceiptsCommand)
export class DeleteReceiptsHandler implements ICommandHandler<DeleteReceiptsCommand> {
  public constructor(private readonly receiptRepository: ReceiptRepository) {}

  public async execute(command: DeleteReceiptsCommand): Promise<void> {
    await this.receiptRepository.deleteByCreatedWindow(
      command.from,
      command.to,
    );
  }
}
