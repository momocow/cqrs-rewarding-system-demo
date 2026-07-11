import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';
import { RewardQueryInMemoryRepositoryImpl } from './reward-query-in-memory.repository-impl';
import { RewardSessionInMemoryRepositoryImpl } from './reward-session-in-memory.repository-impl';

@Module({
  imports: [CqrsModule],
  providers: [
    RewardInMemoryStore,
    {
      provide: RewardSessionRepository,
      useClass: RewardSessionInMemoryRepositoryImpl,
    },
    {
      provide: RewardQueryRepository,
      useClass: RewardQueryInMemoryRepositoryImpl,
    },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [RewardSessionRepository, RewardQueryRepository, UnitOfWork],
})
export class RewardInMemoryPersistenceModule implements OnModuleInit {
  public constructor(private readonly store: RewardInMemoryStore) {}

  public onModuleInit(): void {
    seedRewardStore(this.store);
  }
}
