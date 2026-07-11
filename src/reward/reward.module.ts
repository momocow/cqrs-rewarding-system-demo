import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { RewardInMemoryPersistenceModule } from './infra/in-memory/reward-in-memory.persistence-module';
import { RewardSequelizePersistenceModule } from './infra/sequelize/reward-sequelize.persistence-module';
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
    ConditionalModule.registerWhen(
      RewardSequelizePersistenceModule,
      isSequelize,
    ),
    ConditionalModule.registerWhen(RewardInMemoryPersistenceModule, isMemory),
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
  ],
})
export class RewardModule {}
