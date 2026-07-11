import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';

import {
  IRewardDemoReadModel,
  RewardQueryRepository,
} from '../../domain/reward-query.repository';
import { RewardSource } from '../../types';
import { OrganizationSequelize } from './organization.sequelize';
import { PointSequelize } from './point.sequelize';
import { RewardSessionSequelize } from './reward-session.sequelize';

interface IPointSumRow {
  rewardSessionId: string;
  organizationId: string;
  source: RewardSource;
  total: string | number;
}

@Injectable()
export class RewardQuerySequelizeRepositoryImpl implements RewardQueryRepository {
  public constructor(
    @InjectModel(OrganizationSequelize)
    private readonly organizationSequelize: typeof OrganizationSequelize,
    @InjectModel(RewardSessionSequelize)
    private readonly rewardSessionSequelize: typeof RewardSessionSequelize,
    @InjectModel(PointSequelize)
    private readonly pointSequelize: typeof PointSequelize,
  ) {}

  public async getDemoData(): Promise<IRewardDemoReadModel> {
    const [organizations, sessions, pointRows] = await Promise.all([
      this.organizationSequelize.findAll(),
      this.rewardSessionSequelize.findAll({ order: [['startTime', 'DESC']] }),
      this.pointSequelize.findAll({
        attributes: [
          'rewardSessionId',
          'organizationId',
          'source',
          [fn('SUM', col('amount')), 'total'],
        ],
        group: ['rewardSessionId', 'organizationId', 'source'],
        raw: true,
      }) as unknown as Promise<IPointSumRow[]>,
    ]);

    const pointsKey = (rewardSessionId: string, organizationId: string) =>
      `${rewardSessionId}::${organizationId}`;
    const pointsBySession = new Map<
      string,
      { transaction: number; receipt: number }
    >();
    for (const row of pointRows) {
      const key = pointsKey(row.rewardSessionId, row.organizationId);
      const entry = pointsBySession.get(key) ?? { transaction: 0, receipt: 0 };
      const amount = Number(row.total) || 0;
      if (row.source === RewardSource.Transaction) {
        entry.transaction = amount;
      } else if (row.source === RewardSource.Receipt) {
        entry.receipt = amount;
      }
      pointsBySession.set(key, entry);
    }

    return {
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        creditLimit: o.creditLimit,
      })),
      sessions: sessions.map((s) => {
        const points = pointsBySession.get(
          pointsKey(s.id, s.organizationId),
        ) ?? { transaction: 0, receipt: 0 };
        return {
          id: s.id,
          organizationId: s.organizationId,
          startTime: s.startTime,
          endTime: s.endTime,
          totalTransactionAmount: s.totalTransactionAmount,
          totalReceiptCount: s.totalReceiptCount,
          totalTransactionPointAmount: points.transaction,
          totalReceiptPointAmount: points.receipt,
        };
      }),
    };
  }
}
