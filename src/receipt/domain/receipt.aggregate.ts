import { Aggregate } from '@/utils/ddd';

import { IReceiptEntity, ReceiptEntity } from './receipt.entity';
import { ReceiptCreatedEvent } from './receipt.event';

export class ReceiptAggregate extends Aggregate<
  ReceiptEntity,
  ReceiptCreatedEvent
> {
  public constructor(receipt: IReceiptEntity) {
    super(new ReceiptEntity(receipt));
  }

  public create() {
    this.apply(
      new ReceiptCreatedEvent({
        receiptId: this.root.id,
        organizationId: this.root.organizationId,
        content: this.root.content,
      }),
    );
  }

  public toJSON() {
    return super.toJSON() as { root: IReceiptEntity };
  }
}
