import { BadRequestException } from '@nestjs/common';

import { TransactionController } from './transaction.controller';
import { TransactionType } from './types';

describe('TransactionController', () => {
  const dto = (overrides: Record<string, unknown> = {}) => ({
    organizationId: 'org-1',
    cardId: 'card-1',
    amount: 1000,
    type: TransactionType.Spend,
    merchant: 'M',
    clearedTime: '2026-07-15T00:00:00.000Z',
    ...overrides,
  });

  it('rejects a spend with a negative amount', async () => {
    const commandBus = { execute: jest.fn() };
    const controller = new TransactionController(commandBus as never);

    await expect(
      controller.create(dto({ type: TransactionType.Spend, amount: -1 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('rejects a refund with a non-negative amount', async () => {
    const commandBus = { execute: jest.fn() };
    const controller = new TransactionController(commandBus as never);

    await expect(
      controller.create(dto({ type: TransactionType.Refund, amount: 1 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('accepts a refund with a negative amount', async () => {
    const commandBus = { execute: jest.fn() };
    const controller = new TransactionController(commandBus as never);

    await controller.create(dto({ type: TransactionType.Refund, amount: -300 }));

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });
});
