import { Injectable } from '@nestjs/common';

import {
  IRewardDemoReadModel,
  RewardQueryRepository,
} from '../../domain/reward-query.repository';
import { RewardSource } from '../../types';
import { RewardInMemoryStore } from './reward.in-memory-store';

@Injectable()
export class RewardQueryInMemoryRepositoryImpl implements RewardQueryRepository {
  public constructor(private readonly store: RewardInMemoryStore) {}

  public getDemoData(): Promise<IRewardDemoReadModel> {
    const sumBy = (
      rewardSessionId: string,
      organizationId: string,
      source: RewardSource,
    ) =>
      this.store.points
        .filter(
          (p) =>
            p.rewardSessionId === rewardSessionId &&
            p.organizationId === organizationId &&
            p.source === source,
        )
        .reduce((total, p) => total + p.amount, 0);

    const sessions = [...this.store.sessions.values()]
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .map((s) => ({
        id: s.id,
        organizationId: s.organizationId,
        startTime: s.startTime,
        endTime: s.endTime,
        totalTransactionAmount: s.totalTransactionAmount,
        totalReceiptCount: s.totalReceiptCount,
        totalTransactionPointAmount: sumBy(
          s.id,
          s.organizationId,
          RewardSource.Transaction,
        ),
        totalReceiptPointAmount: sumBy(
          s.id,
          s.organizationId,
          RewardSource.Receipt,
        ),
      }));

    return Promise.resolve({
      organizations: [...this.store.organizations.values()].map((o) => ({
        id: o.id,
        name: o.name,
        creditLimit: o.creditLimit,
      })),
      sessions,
    });
  }
}
