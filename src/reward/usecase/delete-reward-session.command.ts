import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface IDeleteRewardSessionCommand extends ICommand {
  sessionId: string;
}

export class DeleteRewardSessionCommand
  extends DataClass<IDeleteRewardSessionCommand>
  implements IDeleteRewardSessionCommand
{
  declare public readonly sessionId: string;
}
