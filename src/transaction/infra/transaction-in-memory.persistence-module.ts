import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { TransactionRepository } from '../domain/transaction.repository';
import { TransactionInMemoryRepositoryImpl } from './transaction-in-memory.repository-impl';

@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: TransactionRepository,
      useClass: TransactionInMemoryRepositoryImpl,
    },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [TransactionRepository, UnitOfWork],
})
export class TransactionInMemoryPersistenceModule {}
