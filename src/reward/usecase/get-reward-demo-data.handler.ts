import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';

import { RewardSessionEntity } from '../domain/reward-session.entity';
import { OrganizationSequelize } from '../infra/organization.sequelize';
import { PointSequelize } from '../infra/point.sequelize';
import { RewardSessionSequelize } from '../infra/reward-session.sequelize';
import { RewardSource } from '../types';
import {
  GetRewardDemoDataQuery,
  IRewardDemoData,
} from './get-reward-demo-data.query';

interface IPointSumRow {
  rewardSessionId: string;
  source: RewardSource;
  total: string | number;
}

@QueryHandler(GetRewardDemoDataQuery)
export class GetRewardDemoDataHandler implements IQueryHandler<
  GetRewardDemoDataQuery,
  IRewardDemoData
> {
  public constructor(
    @InjectModel(OrganizationSequelize)
    private readonly organizationSequelize: typeof OrganizationSequelize,
    @InjectModel(RewardSessionSequelize)
    private readonly rewardSessionSequelize: typeof RewardSessionSequelize,
    @InjectModel(PointSequelize)
    private readonly pointSequelize: typeof PointSequelize,
  ) {}

  public async execute(): Promise<IRewardDemoData> {
    // Reward policies are the same defaults for every session.
    const policies = new RewardSessionEntity({});

    const [organizations, sessions, pointRows] = await Promise.all([
      this.organizationSequelize.findAll(),
      this.rewardSessionSequelize.findAll({ order: [['startTime', 'DESC']] }),
      this.pointSequelize.findAll({
        attributes: [
          'rewardSessionId',
          'source',
          [fn('SUM', col('amount')), 'total'],
        ],
        group: ['rewardSessionId', 'source'],
        raw: true,
      }) as unknown as Promise<IPointSumRow[]>,
    ]);

    const pointsBySession = new Map<
      string,
      { transaction: number; receipt: number }
    >();
    for (const row of pointRows) {
      const entry = pointsBySession.get(row.rewardSessionId) ?? {
        transaction: 0,
        receipt: 0,
      };
      const amount = Number(row.total) || 0;
      if (row.source === RewardSource.Transaction) {
        entry.transaction = amount;
      } else if (row.source === RewardSource.Receipt) {
        entry.receipt = amount;
      }
      pointsBySession.set(row.rewardSessionId, entry);
    }

    return {
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        creditLimit: o.creditLimit,
      })),
      sessions: sessions.map((s) => {
        const points = pointsBySession.get(s.id) ?? {
          transaction: 0,
          receipt: 0,
        };
        return {
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          totalTransactionAmount: s.totalTransactionAmount,
          totalReceiptCount: s.totalReceiptCount,
          totalTransactionPointAmount: points.transaction,
          totalReceiptPointAmount: points.receipt,
          transactionRewardPolicies: policies.transactionRewardPolicies.map(
            (p) => ({ threshold: p.threshold, points: p.points }),
          ),
          receiptRewardPolicies: policies.receiptRewardPolicies.map((p) => ({
            threshold: p.threshold,
            points: p.points,
          })),
        };
      }),
    };
  }
}
