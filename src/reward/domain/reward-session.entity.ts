import { Entity, IEntity } from '@/utils/ddd';

import { RewardPolicyValueObject } from './reward-policy.value-object';

export interface IRewardSessionEntity extends IEntity {
  totalTransactionPointAmount: number;
  totalReceiptPointAmount: number;
  totalTransactionAmount: number;
  totalReceiptCount: number;
  startTime: Date;
  endTime: Date;
  transactionRewardPolicies?: RewardPolicyValueObject[];
  receiptRewardPolicies?: RewardPolicyValueObject[];
}

export class RewardSessionEntity
  extends Entity<IRewardSessionEntity>
  implements IRewardSessionEntity
{
  declare public totalTransactionPointAmount: number;
  declare public totalReceiptPointAmount: number;
  declare public totalTransactionAmount: number;
  declare public totalReceiptCount: number;
  declare public startTime: Date;
  declare public endTime: Date;

  public transactionRewardPolicies: RewardPolicyValueObject[] = [
    new RewardPolicyValueObject({
      threshold: 0.2,
      points: 300,
    }),
    new RewardPolicyValueObject({
      threshold: 0.4,
      points: 600,
    }),
    new RewardPolicyValueObject({
      threshold: 0.6,
      points: 900,
    }),
  ];

  public receiptRewardPolicies: RewardPolicyValueObject[] = [
    new RewardPolicyValueObject({
      threshold: 10,
      points: 100,
    }),
  ];
}
