import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { TransactionRepository } from './domain/transaction.repository';
import { TransactionSequelize } from './infra/transaction.sequelize';
import { TransactionSequelizeRepositoryImpl } from './infra/transaction-sequelize.repository-impl';
import { TransactionController } from './transaction.controller';
import { CreateTransactionHandler } from './usecase/create-transaction.handler';
import { DeleteTransactionsHandler } from './usecase/delete-transactions.handler';

@Module({
  imports: [CqrsModule, SequelizeModule.forFeature([TransactionSequelize])],
  controllers: [TransactionController],
  providers: [
    // command handlers
    CreateTransactionHandler,
    DeleteTransactionsHandler,

    // infra
    {
      provide: TransactionRepository,
      useClass: TransactionSequelizeRepositoryImpl,
    },
  ],
})
export class TransactionModule {}
