import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

import { ITransaction } from '../types';

export interface IApplyTransactionRewardCommand extends ICommand {
  organizationId: string;
  transaction: ITransaction;
}

export class ApplyTransactionRewardCommand
  extends DataClass<IApplyTransactionRewardCommand>
  implements IApplyTransactionRewardCommand
{
  declare public readonly organizationId: string;
  declare public readonly transaction: ITransaction;
}
