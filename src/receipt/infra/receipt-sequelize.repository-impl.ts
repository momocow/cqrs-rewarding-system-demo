import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';

import { RepositoryImpl } from '@/utils/ddd';

import { ReceiptAggregate } from '../domain/receipt.aggregate';
import { IReceiptEntity } from '../domain/receipt.entity';
import { ReceiptRepository } from '../domain/receipt.repository';
import { ReceiptSequelize } from './receipt.sequelize';

@Injectable()
export class ReceiptSequelizeRepositoryImpl
  extends RepositoryImpl<typeof ReceiptAggregate>
  implements ReceiptRepository
{
  public constructor(
    @InjectModel(ReceiptSequelize)
    private readonly receiptSequelize: typeof ReceiptSequelize,
    eventPublisher: EventPublisher,
  ) {
    super(ReceiptAggregate, eventPublisher);
  }

  public build(receipt: IReceiptEntity): ReceiptAggregate {
    return new this.AggregateClass(receipt);
  }

  public findOneById(_: string): Promise<ReceiptAggregate> {
    throw new Error('Method not implemented.');
  }

  public async save(receipt: ReceiptAggregate): Promise<void> {
    const { root } = receipt.toJSON();

    await this.receiptSequelize.upsert({
      id: root.id,
      organizationId: root.organizationId,
      content: root.content,
    });
  }

  public async deleteByCreatedWindow(from: Date, to: Date): Promise<void> {
    // createdAt is a Sequelize-managed timestamp, not in the typed attributes
    await this.receiptSequelize.destroy({
      where: { createdAt: { [Op.gte]: from, [Op.lt]: to } } as WhereOptions,
    });
  }
}
