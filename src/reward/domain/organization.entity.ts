import { Entity, IEntity } from '@/utils/ddd';

export interface IOrganizationEntity extends IEntity {
  creditLimit: number;
}

export class OrganizationEntity
  extends Entity<IOrganizationEntity>
  implements IOrganizationEntity
{
  declare public creditLimit: number;
}
