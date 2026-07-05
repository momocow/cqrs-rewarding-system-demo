import { Entity, IEntity } from '@/utils/ddd';

export interface IReceiptEntity extends IEntity {
  organizationId: string;
  content: string;
}

export class ReceiptEntity
  extends Entity<IReceiptEntity>
  implements IReceiptEntity
{
  declare public readonly organizationId: string;
  declare public readonly content: string;
}
