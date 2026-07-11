import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionEntity } from '../domain/reward-session.entity';
import {
  GetRewardDemoDataQuery,
  IRewardDemoData,
} from './get-reward-demo-data.query';

@QueryHandler(GetRewardDemoDataQuery)
export class GetRewardDemoDataHandler implements IQueryHandler<
  GetRewardDemoDataQuery,
  IRewardDemoData
> {
  public constructor(
    private readonly rewardQueryRepository: RewardQueryRepository,
  ) {}

  public async execute(): Promise<IRewardDemoData> {
    // Reward policies are the same defaults for every session.
    const policies = new RewardSessionEntity({});
    const { organizations, sessions } =
      await this.rewardQueryRepository.getDemoData();

    return {
      organizations,
      sessions: sessions.map((s) => ({
        ...s,
        transactionRewardPolicies: policies.transactionRewardPolicies.map(
          (p) => ({ threshold: p.threshold, points: p.points }),
        ),
        receiptRewardPolicies: policies.receiptRewardPolicies.map((p) => ({
          threshold: p.threshold,
          points: p.points,
        })),
      })),
    };
  }
}
