import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface ICreateRewardSessionCommand extends ICommand {
  startTime: Date;
  endTime: Date;
}

export class CreateRewardSessionCommand
  extends DataClass<ICreateRewardSessionCommand>
  implements ICreateRewardSessionCommand
{
  declare public readonly startTime: Date;
  declare public readonly endTime: Date;
}
