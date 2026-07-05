import { BadRequestException } from '@nestjs/common';

import { TransactionController } from './transaction.controller';
import { TransactionType } from './types';

describe('TransactionController', () => {
  const dto = {
    organizationId: 'org-1',
    cardId: 'card-1',
    amount: -1,
    type: TransactionType.Refund,
    merchant: 'M',
    clearedTime: '2026-07-15T00:00:00.000Z',
  };

  it('rejects a negative amount with BadRequestException', async () => {
    const commandBus = { execute: jest.fn() };
    const controller = new TransactionController(commandBus as never);

    await expect(controller.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
