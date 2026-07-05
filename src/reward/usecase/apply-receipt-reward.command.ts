import { ICommand } from '@nestjs/cqrs';

import { DataClass } from '@/utils/dataclass';

export interface IApplyReceiptRewardCommand extends ICommand {
  organizationId: string;
  time: Date;
}

export class ApplyReceiptRewardCommand
  extends DataClass<IApplyReceiptRewardCommand>
  implements IApplyReceiptRewardCommand
{
  declare public readonly organizationId: string;
  declare public readonly time: Date;
}
