import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { RewardSessionRepository } from './domain/reward-session.repository';
import { OrganizationSequelize } from './infra/organization.sequelize';
import { PointSequelize } from './infra/point.sequelize';
import { RewardSessionSequelize } from './infra/reward-session.sequelize';
import { RewardSessionSequelizeRepositoryImpl } from './infra/reward-session-sequelize.repository-impl';
import { RewardController } from './reward.controller';
import { ApplyReceiptRewardHandler } from './usecase/apply-receipt-reward.handler';
import { ApplyTransactionRewardHandler } from './usecase/apply-transaction-reward.handler';
import { CreateRewardSessionHandler } from './usecase/create-reward-session.handler';
import { DeleteRewardSessionHandler } from './usecase/delete-reward-session.handler';
import { GetRewardDemoDataHandler } from './usecase/get-reward-demo-data.handler';
import { PointRewardedEmitterHandler } from './usecase/point-rewarded.emitter-handler';
import { RecognizeReceiptHandler } from './usecase/recognize-receipt.handler';
import { RecognizeTransactionHandler } from './usecase/recognize-transaction.handler';
import { RewardSaga } from './usecase/reward.saga';
import { RewardEventsEmitter } from './usecase/reward-events.emitter';

@Module({
  imports: [
    CqrsModule,
    SequelizeModule.forFeature([
      OrganizationSequelize,
      PointSequelize,
      RewardSessionSequelize,
    ]),
  ],
  controllers: [RewardController],
  providers: [
    // command handlers
    ApplyReceiptRewardHandler,
    ApplyTransactionRewardHandler,
    CreateRewardSessionHandler,
    DeleteRewardSessionHandler,
    RecognizeReceiptHandler,
    RecognizeTransactionHandler,

    // query handlers
    GetRewardDemoDataHandler,

    // event handlers
    PointRewardedEmitterHandler,

    // sagas
    RewardSaga,

    // in-process emitter backing the SSE stream
    RewardEventsEmitter,

    // infra
    {
      provide: RewardSessionRepository,
      useClass: RewardSessionSequelizeRepositoryImpl,
    },
  ],
})
export class RewardModule {}
