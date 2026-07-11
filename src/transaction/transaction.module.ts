import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { TransactionInMemoryPersistenceModule } from './infra/transaction-in-memory.persistence-module';
import { TransactionSequelizePersistenceModule } from './infra/transaction-sequelize.persistence-module';
import { TransactionController } from './transaction.controller';
import { CreateTransactionHandler } from './usecase/create-transaction.handler';
import { DeleteTransactionsHandler } from './usecase/delete-transactions.handler';

@Module({
  imports: [
    CqrsModule,
    ConditionalModule.registerWhen(
      TransactionSequelizePersistenceModule,
      isSequelize,
    ),
    ConditionalModule.registerWhen(
      TransactionInMemoryPersistenceModule,
      isMemory,
    ),
  ],
  controllers: [TransactionController],
  providers: [CreateTransactionHandler, DeleteTransactionsHandler],
})
export class TransactionModule {}
