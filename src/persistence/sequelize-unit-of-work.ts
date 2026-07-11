import { Injectable } from '@nestjs/common';
import cls from 'cls-hooked';
import { Sequelize as SequelizeCls } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

import { UnitOfWork } from '@/utils/ddd';

const CLS_NAMESPACE = 'sequelize';

/**
 * Sequelize-backed unit of work: runs `work` inside a database transaction.
 *
 * Binds a cls-hooked namespace via `Sequelize.useCLS` so a transaction opened
 * here propagates to model calls inside `work` that don't pass the transaction
 * explicitly. `useCLS` sets a static that the transaction machinery reads at
 * call time (sequelize v6 `Sequelize._cls`), so binding it in the constructor —
 * before any request, and only when the Sequelize backend is active — is
 * sufficient; no app-wide bootstrap side-effect is needed. It is set on the
 * base `sequelize` class because that is the static the query layer reads.
 */
@Injectable()
export class SequelizeUnitOfWork extends UnitOfWork {
  public constructor(private readonly sequelize: Sequelize) {
    super();
    SequelizeCls.useCLS(
      cls.getNamespace(CLS_NAMESPACE) ?? cls.createNamespace(CLS_NAMESPACE),
    );
  }

  public run<T>(work: () => Promise<T>): Promise<T> {
    return this.sequelize.transaction(work);
  }
}
