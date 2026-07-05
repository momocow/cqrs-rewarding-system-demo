import { Entity, IEntity } from '@/utils/ddd';

import { TransactionType } from '../types';

export interface ITransactionEntity extends IEntity {
  organizationId: string;
  cardId: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  clearedAt: Date;
}

export class TransactionEntity
  extends Entity<ITransactionEntity>
  implements ITransactionEntity
{
  declare public readonly organizationId: string;
  declare public readonly cardId: string;
  declare public readonly amount: number;
  declare public readonly type: TransactionType;
  declare public readonly merchant: string;
  declare public readonly clearedAt: Date;
}
