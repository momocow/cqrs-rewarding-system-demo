import { Op } from 'sequelize';
import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface IRewardSessionSequelize {
  id: string;
  organizationId: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
}

@Table({ underscored: true, tableName: 'reward_sessions' })
export class RewardSessionSequelize
  extends Model<IRewardSessionSequelize>
  implements IRewardSessionSequelize
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare public id: string;

  @Column(DataType.UUID)
  declare public organizationId: string;

  @Column
  declare public startTime: Date;

  @Column
  declare public endTime: Date;

  @Column
  declare public totalTransactionAmount: number;

  @Column
  declare public totalReceiptCount: number;

  public static findActiveOne(
    organizationId: string,
    time: Date,
  ): Promise<RewardSessionSequelize | null> {
    return this.findOne({
      where: {
        organizationId,
        startTime: { [Op.lte]: time },
        endTime: { [Op.gt]: time },
      },
    });
  }
}
