import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { ReceiptRepository } from './domain/receipt.repository';
import { ReceiptSequelize } from './infra/receipt.sequelize';
import { ReceiptSequelizeRepositoryImpl } from './infra/receipt-sequelize.repository-impl';
import { ReceiptController } from './receipt.controller';
import { CreateReceiptHandler } from './usecase/create-receipt.handler';
import { DeleteReceiptsHandler } from './usecase/delete-receipts.handler';

@Module({
  imports: [CqrsModule, SequelizeModule.forFeature([ReceiptSequelize])],
  controllers: [ReceiptController],
  providers: [
    // command handlers
    CreateReceiptHandler,
    DeleteReceiptsHandler,

    // infra
    {
      provide: ReceiptRepository,
      useClass: ReceiptSequelizeRepositoryImpl,
    },
  ],
})
export class ReceiptModule {}
