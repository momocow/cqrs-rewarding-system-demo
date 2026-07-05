import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { TransactionType } from '../types';

export interface ITransactionSequelize {
  id: string;
  organizationId: string;
  cardId: string;
  amount: number;
  type: TransactionType;
  merchant: string;
  clearedAt: Date;
}

@Table({ underscored: true, tableName: 'transactions' })
export class TransactionSequelize
  extends Model<ITransactionSequelize>
  implements ITransactionSequelize
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare public id: string;

  @Column(DataType.UUID)
  declare public organizationId: string;

  @Column
  declare public cardId: string;

  @Column
  declare public amount: number;

  @Column
  declare public merchant: string;

  @Column
  declare public clearedAt: Date;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
  })
  declare public type: TransactionType;
}
