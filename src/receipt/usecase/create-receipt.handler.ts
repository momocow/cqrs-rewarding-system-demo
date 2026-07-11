import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { CreateReceiptCommand } from './create-receipt.command';

@CommandHandler(CreateReceiptCommand)
export class CreateReceiptHandler implements ICommandHandler<CreateReceiptCommand> {
  public constructor(
    private readonly receiptRepository: ReceiptRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateReceiptCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const receipt = this.receiptRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        content: command.content,
      });
      receipt.create();
      await this.receiptRepository.save(receipt);
      receipt.commit();
    });
  }
}
