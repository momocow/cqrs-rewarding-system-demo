import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface IReceiptSequelize {
  id: string;
  organizationId: string;
  content: string;
}

@Table({ underscored: true, tableName: 'receipts' })
export class ReceiptSequelize
  extends Model<IReceiptSequelize>
  implements IReceiptSequelize
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare public id: string;

  @Column(DataType.UUID)
  declare public organizationId: string;

  @Column({ type: DataType.TEXT })
  declare public content: string;
}
