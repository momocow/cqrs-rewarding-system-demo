import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

/**
 * Owns the Sequelize database connection. Imported only when the Sequelize
 * driver is active, so the app opens no connection in memory mode.
 */
@Module({
  imports: [
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
  ],
})
export class SequelizeConnectionModule {}
