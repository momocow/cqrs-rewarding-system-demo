import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface IDeleteReceiptsCommand extends ICommand {
  from: Date;
  to: Date;
}

export class DeleteReceiptsCommand
  extends DataClass<IDeleteReceiptsCommand>
  implements IDeleteReceiptsCommand
{
  declare public readonly from: Date;
  declare public readonly to: Date;
}
