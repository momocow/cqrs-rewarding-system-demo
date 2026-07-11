import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { RepositoryImpl } from '@/utils/ddd';

import { TransactionAggregate } from '../../domain/transaction.aggregate';
import { ITransactionEntity } from '../../domain/transaction.entity';
import { TransactionRepository } from '../../domain/transaction.repository';

@Injectable()
export class TransactionInMemoryRepositoryImpl
  extends RepositoryImpl<typeof TransactionAggregate>
  implements TransactionRepository
{
  private readonly store = new Map<string, ITransactionEntity>();

  public constructor(eventPublisher: EventPublisher) {
    super(TransactionAggregate, eventPublisher);
  }

  public build(transaction: ITransactionEntity): TransactionAggregate {
    return new this.AggregateClass(transaction);
  }

  public findOneById(id: string): Promise<TransactionAggregate> {
    const record = this.store.get(id);
    if (!record) {
      return Promise.reject(new Error(`transaction (id=${id}) not found`));
    }
    return Promise.resolve(this.build(record));
  }

  public save(transaction: TransactionAggregate): Promise<void> {
    const { root } = transaction.toJSON();
    this.store.set(root.id, { ...root });
    return Promise.resolve();
  }

  public deleteByClearedWindow(from: Date, to: Date): Promise<void> {
    for (const [id, record] of this.store) {
      if (record.clearedAt >= from && record.clearedAt < to) {
        this.store.delete(id);
      }
    }
    return Promise.resolve();
  }
}
