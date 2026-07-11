import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { ReceiptSequelize } from './receipt.sequelize';
import { ReceiptSequelizeRepositoryImpl } from './receipt-sequelize.repository-impl';

@Module({
  imports: [CqrsModule, SequelizeModule.forFeature([ReceiptSequelize])],
  providers: [
    { provide: ReceiptRepository, useClass: ReceiptSequelizeRepositoryImpl },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [ReceiptRepository, UnitOfWork],
})
export class ReceiptSequelizePersistenceModule {}
