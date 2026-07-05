import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

import { TransactionType } from '../types';

export interface ICreateTransactionCommand extends ICommand {
  organizationId: string;
  cardId: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  clearedTime: Date;
}

export class CreateTransactionCommand
  extends DataClass<ICreateTransactionCommand>
  implements ICreateTransactionCommand
{
  declare public readonly organizationId: string;
  declare public readonly cardId: string;
  declare public readonly amount: number;
  declare public readonly type: TransactionType;
  declare public readonly merchant: string;
  declare public readonly clearedTime: Date;
}
