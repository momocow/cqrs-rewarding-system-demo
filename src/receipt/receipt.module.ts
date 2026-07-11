import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { ReceiptInMemoryPersistenceModule } from './infra/in-memory/receipt-in-memory.persistence-module';
import { ReceiptSequelizePersistenceModule } from './infra/sequelize/receipt-sequelize.persistence-module';
import { ReceiptController } from './receipt.controller';
import { CreateReceiptHandler } from './usecase/create-receipt.handler';
import { DeleteReceiptsHandler } from './usecase/delete-receipts.handler';

@Module({
  imports: [
    CqrsModule,
    ConditionalModule.registerWhen(
      ReceiptSequelizePersistenceModule,
      isSequelize,
    ),
    ConditionalModule.registerWhen(ReceiptInMemoryPersistenceModule, isMemory),
  ],
  controllers: [ReceiptController],
  providers: [CreateReceiptHandler, DeleteReceiptsHandler],
})
export class ReceiptModule {}
