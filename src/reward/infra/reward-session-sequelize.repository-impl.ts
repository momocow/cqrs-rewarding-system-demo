import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'crypto';

import { RepositoryImpl } from '@/utils/ddd';

import { RewardSessionAggregate } from '../domain/reward-session.aggregate';
import { IRewardSessionEntity } from '../domain/reward-session.entity';
import { PointRewardedEvent } from '../domain/reward-session.event';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RewardSource } from '../types';
import { OrganizationSequelize } from './organization.sequelize';
import { PointSequelize } from './point.sequelize';
import { RewardSessionSequelize } from './reward-session.sequelize';

@Injectable()
export class RewardSessionSequelizeRepositoryImpl
  extends RepositoryImpl<typeof RewardSessionAggregate>
  implements RewardSessionRepository
{
  public constructor(
    @InjectModel(OrganizationSequelize)
    private readonly organizationSequelize: typeof OrganizationSequelize,
    @InjectModel(PointSequelize)
    private readonly pointSequelize: typeof PointSequelize,
    @InjectModel(RewardSessionSequelize)
    private readonly rewardSessionSequelize: typeof RewardSessionSequelize,
    eventPublisher: EventPublisher,
  ) {
    super(RewardSessionAggregate, eventPublisher);
  }

  public async findOneActive(
    organizationId: string,
    time: Date,
  ): Promise<RewardSessionAggregate> {
    const [organization, session] = await Promise.all([
      this.findOneOrganizationById(organizationId),
      this.findOneActiveRewardSession(time),
    ]);
    const organizationObj = organization.toJSON();
    const sessionObj = session.toJSON();
    const [totalTransactionPointAmount, totalReceiptPointAmount] =
      await Promise.all([
        this.sumPointAmount(session.id, RewardSource.Transaction),
        this.sumPointAmount(session.id, RewardSource.Receipt),
      ]);

    return new this.AggregateClass(
      {
        ...sessionObj,
        totalTransactionPointAmount,
        totalReceiptPointAmount,
      },
      organizationObj,
    );
  }

  public findOneById(_: string): Promise<RewardSessionAggregate> {
    throw new Error('Method not implemented.');
  }

  public build(session: IRewardSessionEntity): RewardSessionAggregate {
    return new this.AggregateClass(session);
  }

  public async deleteById(id: string): Promise<void> {
    await this.pointSequelize.destroy({ where: { rewardSessionId: id } });
    await this.rewardSessionSequelize.destroy({ where: { id } });
  }

  public async save(session: RewardSessionAggregate): Promise<void> {
    const { root } = session.toJSON();

    await Promise.all([
      // persist reward session changes (insert on create, update otherwise)
      this.rewardSessionSequelize.upsert({
        id: root.id,
        endTime: root.endTime,
        startTime: root.startTime,
        totalTransactionAmount: root.totalTransactionAmount,
        totalReceiptCount: root.totalReceiptCount,
      }),

      // @todo persist reward policies changes

      // persist point changes
      this.pointSequelize.bulkCreate(
        session
          .getUncommittedEvents()
          .filter((e) => e instanceof PointRewardedEvent)
          .map((e) => ({
            id: randomUUID(),
            amount: e.pointAmount,
            organizationId: e.organizationId,
            rewardSessionId: e.sessionId,
            type: e.type,
            source: e.source,
          })),
      ),
    ]);
  }

  private async findOneOrganizationById(organizationId: string) {
    const organization = await this.organizationSequelize.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error(`organization (id=${organizationId}) not found`);
    }

    return organization;
  }

  private async findOneActiveRewardSession(time: Date) {
    const session = await this.rewardSessionSequelize.findActiveOne(time);

    if (!session) {
      throw new Error(
        `active reward session (time=${time.toISOString()}) not found`,
      );
    }

    return session;
  }

  private async sumPointAmount(
    rewardSessionId: string,
    source: RewardSource,
  ): Promise<number> {
    const total = await this.pointSequelize.sum('amount', {
      where: {
        rewardSessionId,
        source,
      },
    });

    return total ?? 0;
  }
}
