import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { TransactionRepository } from '../domain/transaction.repository';
import { TransactionSequelize } from './transaction.sequelize';
import { TransactionSequelizeRepositoryImpl } from './transaction-sequelize.repository-impl';

@Module({
  imports: [CqrsModule, SequelizeModule.forFeature([TransactionSequelize])],
  providers: [
    {
      provide: TransactionRepository,
      useClass: TransactionSequelizeRepositoryImpl,
    },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [TransactionRepository, UnitOfWork],
})
export class TransactionSequelizePersistenceModule {}
