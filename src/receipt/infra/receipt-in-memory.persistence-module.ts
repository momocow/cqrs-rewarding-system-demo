import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { ReceiptInMemoryRepositoryImpl } from './receipt-in-memory.repository-impl';

@Module({
  imports: [CqrsModule],
  providers: [
    { provide: ReceiptRepository, useClass: ReceiptInMemoryRepositoryImpl },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [ReceiptRepository, UnitOfWork],
})
export class ReceiptInMemoryPersistenceModule {}
