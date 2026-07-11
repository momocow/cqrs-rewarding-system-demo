import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReceiptModule } from './receipt';
import { RewardModule } from './reward';
import { TransactionModule } from './transaction';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // In production (Heroku) connect via DATABASE_URL over SSL; fall back to
    // local Postgres for development.
    SequelizeModule.forRoot(
      process.env.DATABASE_URL
        ? {
            dialect: 'postgres',
            uri: process.env.DATABASE_URL,
            dialectOptions: {
              ssl: { require: true, rejectUnauthorized: false },
            },
            autoLoadModels: true,
            synchronize: false,
          }
        : {
            dialect: 'postgres',
            host: 'localhost',
            port: 5433,
            username: 'postgres',
            password: 'postgres',
            database: 'reward_demo',
            autoLoadModels: true,
            synchronize: false,
          },
    ),
    TransactionModule,
    RewardModule,
    ReceiptModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
