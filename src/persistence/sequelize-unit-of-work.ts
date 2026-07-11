import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

import { UnitOfWork } from '@/utils/ddd';

@Injectable()
export class SequelizeUnitOfWork extends UnitOfWork {
  public constructor(private readonly sequelize: Sequelize) {
    super();
  }

  public run<T>(work: () => Promise<T>): Promise<T> {
    // CLS (src/setup.ts) binds this transaction to model calls that don't pass
    // it explicitly, matching the previous `this.sequelize.transaction(cb)`.
    return this.sequelize.transaction(work);
  }
}
