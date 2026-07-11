import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { RepositoryImpl } from '@/utils/ddd';

import { ReceiptAggregate } from '../domain/receipt.aggregate';
import { IReceiptEntity } from '../domain/receipt.entity';
import { ReceiptRepository } from '../domain/receipt.repository';

interface IStoredReceipt {
  root: IReceiptEntity;
  createdAt: Date;
}

@Injectable()
export class ReceiptInMemoryRepositoryImpl
  extends RepositoryImpl<typeof ReceiptAggregate>
  implements ReceiptRepository
{
  private readonly store = new Map<string, IStoredReceipt>();

  public constructor(eventPublisher: EventPublisher) {
    super(ReceiptAggregate, eventPublisher);
  }

  public build(receipt: IReceiptEntity): ReceiptAggregate {
    return new this.AggregateClass(receipt);
  }

  public findOneById(id: string): Promise<ReceiptAggregate> {
    const record = this.store.get(id);
    if (!record) {
      // Reject (do not throw synchronously) so callers and `rejects.toThrow`
      // assertions see a rejected promise rather than a sync exception.
      return Promise.reject(new Error(`receipt (id=${id}) not found`));
    }
    return Promise.resolve(this.build(record.root));
  }

  public save(receipt: ReceiptAggregate): Promise<void> {
    const { root } = receipt.toJSON();
    const existing = this.store.get(root.id);
    this.store.set(root.id, {
      root: { ...root },
      createdAt: existing?.createdAt ?? new Date(),
    });
    return Promise.resolve();
  }

  public deleteByCreatedWindow(from: Date, to: Date): Promise<void> {
    for (const [id, record] of this.store) {
      if (record.createdAt >= from && record.createdAt < to) {
        this.store.delete(id);
      }
    }
    return Promise.resolve();
  }
}
