import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { PointType, RewardSource } from '../../types';

export interface IPointSequelize {
  id: string;
  type: PointType;
  source: RewardSource;
  amount: number;
  organizationId: string;
  rewardSessionId: string;
}

@Table({ underscored: true, tableName: 'points' })
export class PointSequelize
  extends Model<IPointSequelize>
  implements IPointSequelize
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare public id: string;

  @Column({
    type: DataType.ENUM(...Object.values(PointType)),
  })
  declare public type: PointType;

  @Column({
    type: DataType.ENUM(...Object.values(RewardSource)),
  })
  declare public source: RewardSource;

  @Column
  declare public amount: number;

  @Column(DataType.UUID)
  declare public organizationId: string;

  @Column(DataType.UUID)
  declare public rewardSessionId: string;
}
