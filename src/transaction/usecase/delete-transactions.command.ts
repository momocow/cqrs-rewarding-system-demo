import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface IDeleteTransactionsCommand extends ICommand {
  from: Date;
  to: Date;
}

export class DeleteTransactionsCommand
  extends DataClass<IDeleteTransactionsCommand>
  implements IDeleteTransactionsCommand
{
  declare public readonly from: Date;
  declare public readonly to: Date;
}
