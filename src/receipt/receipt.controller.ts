import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateReceiptCommand } from './usecase/create-receipt.command';
import { DeleteReceiptsCommand } from './usecase/delete-receipts.command';

export class CreateReceiptDto {
  declare public readonly organizationId: string;
  declare public readonly content: string;
}

@Controller('receipts')
export class ReceiptController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post()
  public async create(@Body() dto: CreateReceiptDto): Promise<void> {
    await this.commandBus.execute(
      new CreateReceiptCommand({
        organizationId: dto.organizationId,
        content: dto.content,
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
      new DeleteReceiptsCommand({ from: new Date(from), to: new Date(to) }),
    );
  }
}
