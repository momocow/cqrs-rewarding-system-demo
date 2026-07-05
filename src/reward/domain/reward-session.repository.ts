import { Repository } from '@/utils/ddd';

import { RewardSessionAggregate } from './reward-session.aggregate';
import { IRewardSessionEntity } from './reward-session.entity';

/**
 * It's an abstract class because Class can be used as a token in NestJS DI.
 * This class is merely used as an interface of the repository without concrete implementation.
 */
export abstract class RewardSessionRepository extends Repository<RewardSessionAggregate> {
  public abstract findOneActive(
    organizationId: string,
    time: Date,
  ): Promise<RewardSessionAggregate>;

  /**
   * Build a new (unpersisted, org-less) reward session aggregate with the
   * event-publisher context merged in, so events applied on it can later be
   * published via `commit()`.
   */
  public abstract build(session: IRewardSessionEntity): RewardSessionAggregate;

  /**
   * Delete a reward session and its associated point rows.
   */
  public abstract deleteById(id: string): Promise<void>;
}
