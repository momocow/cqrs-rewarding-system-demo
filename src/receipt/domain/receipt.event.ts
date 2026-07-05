import { DomainEvent, IDomainEvent } from '@/utils/ddd';

export interface IReceiptEvent extends IDomainEvent {
  receiptId: string;
  organizationId: string;
}

export abstract class ReceiptEvent<E extends IReceiptEvent>
  extends DomainEvent<E>
  implements IReceiptEvent
{
  declare public readonly receiptId: string;
  declare public readonly organizationId: string;
}

export interface IReceiptCreatedEvent extends IReceiptEvent {
  content: string;
}

export class ReceiptCreatedEvent
  extends ReceiptEvent<IReceiptCreatedEvent>
  implements IReceiptCreatedEvent
{
  declare public readonly content: string;
}
