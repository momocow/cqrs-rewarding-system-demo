import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';

import { RepositoryImpl } from '@/utils/ddd';

import { TransactionAggregate } from '../domain/transaction.aggregate';
import { ITransactionEntity } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository';
import { TransactionSequelize } from './transaction.sequelize';

@Injectable()
export class TransactionSequelizeRepositoryImpl
  extends RepositoryImpl<typeof TransactionAggregate>
  implements TransactionRepository
{
  public constructor(
    @InjectModel(TransactionSequelize)
    private readonly transactionSequelize: typeof TransactionSequelize,
    eventPublisher: EventPublisher,
  ) {
    super(TransactionAggregate, eventPublisher);
  }

  public build(transaction: ITransactionEntity): TransactionAggregate {
    return new this.AggregateClass(transaction);
  }

  public findOneById(_: string): Promise<TransactionAggregate> {
    throw new Error('Method not implemented.');
  }

  public async save(transaction: TransactionAggregate): Promise<void> {
    const { root } = transaction.toJSON();

    await this.transactionSequelize.upsert({
      id: root.id,
      organizationId: root.organizationId,
      cardId: root.cardId,
      amount: root.amount,
      type: root.type,
      merchant: root.merchant,
      clearedAt: root.clearedAt,
    });
  }

  public async deleteByClearedWindow(from: Date, to: Date): Promise<void> {
    await this.transactionSequelize.destroy({
      where: { clearedAt: { [Op.gte]: from, [Op.lt]: to } },
    });
  }
}
