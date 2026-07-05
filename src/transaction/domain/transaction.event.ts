import { DomainEvent, IDomainEvent } from '@/utils/ddd';

import { TransactionType } from '../types';

export interface ITransactionEvent extends IDomainEvent {
  transactionId: string;
  organizationId: string;
}

export abstract class TransactionEvent<E extends ITransactionEvent>
  extends DomainEvent<E>
  implements ITransactionEvent
{
  declare public readonly organizationId: string;
  declare public readonly transactionId: string;
}

export interface ITransactionCreatedEvent extends ITransactionEvent {
  cardId: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  clearedTime: Date;
}

export class TransactionCreatedEvent
  extends TransactionEvent<ITransactionCreatedEvent>
  implements ITransactionCreatedEvent
{
  declare public readonly cardId: string;
  declare public readonly amount: number;
  declare public readonly type: TransactionType;
  declare public readonly merchant: string;
  declare public readonly clearedTime: Date;
}
