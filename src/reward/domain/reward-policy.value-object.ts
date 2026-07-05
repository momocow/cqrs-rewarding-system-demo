import { ValueObject } from '@/utils/ddd';

export interface IRewardPolicy {
  threshold: number;
  points: number;
}

export class RewardPolicyValueObject
  extends ValueObject<IRewardPolicy>
  implements IRewardPolicy
{
  declare public readonly threshold: number;
  declare public readonly points: number;
}
