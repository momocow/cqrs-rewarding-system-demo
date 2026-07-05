import { Aggregate } from '@/utils/ddd';

import { ITransactionEntity, TransactionEntity } from './transaction.entity';
import { TransactionCreatedEvent } from './transaction.event';

export class TransactionAggregate extends Aggregate<
  TransactionEntity,
  TransactionCreatedEvent
> {
  public constructor(transaction: ITransactionEntity) {
    super(new TransactionEntity(transaction));
  }

  public create() {
    this.apply(
      new TransactionCreatedEvent({
        transactionId: this.root.id,
        organizationId: this.root.organizationId,
        cardId: this.root.cardId,
        amount: this.root.amount,
        type: this.root.type,
        merchant: this.root.merchant,
        clearedTime: this.root.clearedAt,
      }),
    );
  }

  public toJSON() {
    return super.toJSON() as { root: ITransactionEntity };
  }
}
