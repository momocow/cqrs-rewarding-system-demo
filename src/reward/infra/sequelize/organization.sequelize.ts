import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface IOrganizationSequelize {
  id: string;
  name: string;
  creditLimit: number;
}

@Table({ underscored: true, tableName: 'organizations' })
export class OrganizationSequelize
  extends Model<IOrganizationSequelize>
  implements IOrganizationSequelize
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare public id: string;

  @Column
  declare public name: string;

  @Column
  declare public creditLimit: number;
}
