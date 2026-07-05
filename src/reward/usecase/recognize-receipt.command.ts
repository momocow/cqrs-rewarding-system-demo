import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

import { IReceipt } from '../types';

export interface IRecognizeReceiptCommand extends ICommand {
  organizationId: string;
  receipt: IReceipt;
  time: Date;
}

export class RecognizeReceiptCommand
  extends DataClass<IRecognizeReceiptCommand>
  implements IRecognizeReceiptCommand
{
  declare public readonly organizationId: string;
  declare public readonly receipt: IReceipt;
  declare public readonly time: Date;
}
