import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface ICreateReceiptCommand extends ICommand {
  organizationId: string;
  content: string;
}

export class CreateReceiptCommand
  extends DataClass<ICreateReceiptCommand>
  implements ICreateReceiptCommand
{
  declare public readonly organizationId: string;
  declare public readonly content: string;
}
