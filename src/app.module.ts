import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeConnectionModule } from './persistence/sequelize-connection.module';
import { isSequelize } from './persistence/storage-driver';
import { ReceiptModule } from './receipt';
import { RewardModule } from './reward';
import { TransactionModule } from './transaction';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ConditionalModule.registerWhen(SequelizeConnectionModule, isSequelize),
    TransactionModule,
    RewardModule,
    ReceiptModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
