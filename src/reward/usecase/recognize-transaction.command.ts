import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

import { ITransaction } from '../types';

export interface IRecognizeTransactionCommand extends ICommand {
  organizationId: string;
  transaction: ITransaction;
}

export class RecognizeTransactionCommand
  extends DataClass<IRecognizeTransactionCommand>
  implements IRecognizeTransactionCommand
{
  declare public readonly organizationId: string;
  declare public readonly transaction: ITransaction;
}
