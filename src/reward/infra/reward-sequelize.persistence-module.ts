import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { OrganizationSequelize } from './organization.sequelize';
import { PointSequelize } from './point.sequelize';
import { RewardQuerySequelizeRepositoryImpl } from './reward-query-sequelize.repository-impl';
import { RewardSessionSequelize } from './reward-session.sequelize';
import { RewardSessionSequelizeRepositoryImpl } from './reward-session-sequelize.repository-impl';

@Module({
  imports: [
    CqrsModule,
    SequelizeModule.forFeature([
      OrganizationSequelize,
      PointSequelize,
      RewardSessionSequelize,
    ]),
  ],
  providers: [
    {
      provide: RewardSessionRepository,
      useClass: RewardSessionSequelizeRepositoryImpl,
    },
    {
      provide: RewardQueryRepository,
      useClass: RewardQuerySequelizeRepositoryImpl,
    },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [RewardSessionRepository, RewardQueryRepository, UnitOfWork],
})
export class RewardSequelizePersistenceModule {}
