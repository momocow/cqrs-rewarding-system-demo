import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { TransactionType } from './types';
import { CreateTransactionCommand } from './usecase/create-transaction.command';
import { DeleteTransactionsCommand } from './usecase/delete-transactions.command';

export class CreateTransactionDto {
  declare public readonly organizationId: string;
  declare public readonly cardId: string;
  declare public readonly amount: number;
  declare public readonly type: TransactionType;
  declare public readonly merchant: string;
}

@Controller('transactions')
export class TransactionController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post()
  public async create(@Body() dto: CreateTransactionDto): Promise<void> {
    if (dto.amount < 0) {
      throw new BadRequestException('amount must be non-negative');
    }

    await this.commandBus.execute(
      new CreateTransactionCommand({
        organizationId: dto.organizationId,
        cardId: dto.cardId,
        amount: dto.amount,
        type: dto.type,
        merchant: dto.merchant,
        clearedTime: new Date(),
      }),
    );
  }

  @Delete()
  public async deleteInWindow(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<void> {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }

    await this.commandBus.execute(
      new DeleteTransactionsCommand({
        from: new Date(from),
        to: new Date(to),
      }),
    );
  }
}
