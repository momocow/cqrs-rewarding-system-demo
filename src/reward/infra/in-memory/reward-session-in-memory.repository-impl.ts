import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { RepositoryImpl } from '@/utils/ddd';

import { RewardSessionAggregate } from '../../domain/reward-session.aggregate';
import { IRewardSessionEntity } from '../../domain/reward-session.entity';
import { PointRewardedEvent } from '../../domain/reward-session.event';
import { RewardSessionRepository } from '../../domain/reward-session.repository';
import { RewardSource } from '../../types';
import { RewardInMemoryStore } from './reward.in-memory-store';

@Injectable()
export class RewardSessionInMemoryRepositoryImpl
  extends RepositoryImpl<typeof RewardSessionAggregate>
  implements RewardSessionRepository
{
  public constructor(
    private readonly store: RewardInMemoryStore,
    eventPublisher: EventPublisher,
  ) {
    super(RewardSessionAggregate, eventPublisher);
  }

  public findOneActive(
    organizationId: string,
    time: Date,
  ): Promise<RewardSessionAggregate> {
    const organization = this.store.organizations.get(organizationId);
    if (!organization) {
      // Reject rather than throw synchronously (this method is not `async`),
      // so callers and `rejects.toThrow` assertions see a rejected promise.
      return Promise.reject(
        new Error(`organization (id=${organizationId}) not found`),
      );
    }

    const session = [...this.store.sessions.values()].find(
      (s) =>
        s.organizationId === organizationId &&
        s.startTime <= time &&
        s.endTime > time,
    );
    if (!session) {
      return Promise.reject(
        new Error(
          `active reward session (organizationId=${organizationId}, ` +
            `time=${time.toISOString()}) not found`,
        ),
      );
    }

    return Promise.resolve(
      new this.AggregateClass(
        {
          ...session,
          totalTransactionPointAmount: this.sumPointAmount(
            session.id,
            organizationId,
            RewardSource.Transaction,
          ),
          totalReceiptPointAmount: this.sumPointAmount(
            session.id,
            organizationId,
            RewardSource.Receipt,
          ),
        },
        { id: organization.id, creditLimit: organization.creditLimit },
      ),
    );
  }

  public findOneById(id: string): Promise<RewardSessionAggregate> {
    const session = this.store.sessions.get(id);
    if (!session) {
      return Promise.reject(new Error(`reward session (id=${id}) not found`));
    }
    return Promise.resolve(
      this.build({
        ...session,
        totalTransactionPointAmount: this.sumPointAmount(
          id,
          session.organizationId,
          RewardSource.Transaction,
        ),
        totalReceiptPointAmount: this.sumPointAmount(
          id,
          session.organizationId,
          RewardSource.Receipt,
        ),
      }),
    );
  }

  public build(session: IRewardSessionEntity): RewardSessionAggregate {
    return new this.AggregateClass(session);
  }

  public deleteById(id: string): Promise<void> {
    this.store.sessions.delete(id);
    for (let i = this.store.points.length - 1; i >= 0; i--) {
      if (this.store.points[i].rewardSessionId === id) {
        this.store.points.splice(i, 1);
      }
    }
    return Promise.resolve();
  }

  public save(session: RewardSessionAggregate): Promise<void> {
    const { root } = session.toJSON();

    this.store.sessions.set(root.id, {
      id: root.id,
      organizationId: root.organizationId,
      startTime: root.startTime,
      endTime: root.endTime,
      totalTransactionAmount: root.totalTransactionAmount,
      totalReceiptCount: root.totalReceiptCount,
    });

    session
      .getUncommittedEvents()
      .filter((e): e is PointRewardedEvent => e instanceof PointRewardedEvent)
      .forEach((e) => {
        this.store.points.push({
          id: randomUUID(),
          amount: e.pointAmount,
          organizationId: e.organizationId,
          rewardSessionId: e.sessionId,
          type: e.type,
          source: e.source,
        });
      });

    return Promise.resolve();
  }

  private sumPointAmount(
    rewardSessionId: string,
    organizationId: string,
    source: RewardSource,
  ): number {
    return this.store.points
      .filter(
        (p) =>
          p.rewardSessionId === rewardSessionId &&
          p.organizationId === organizationId &&
          p.source === source,
      )
      .reduce((total, p) => total + p.amount, 0);
  }
}
