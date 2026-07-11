# In-Memory Persistence Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-memory variant of every Sequelize repository (and the non-repository Sequelize couplings) behind backend-agnostic ports so the whole app boots and runs without a database, selectable at startup.

**Architecture:** Introduce four seams — `TransactionRepository`/`ReceiptRepository`/`RewardSessionRepository` (extended), a new `RewardQueryRepository` read-port, and a new `UnitOfWork` port. Each has a Sequelize impl and an in-memory impl. Each feature exposes two nested persistence modules (`${Feature}SequelizePersistenceModule` / `${Feature}InMemoryPersistenceModule`) providing+exporting those ports; feature modules import them via `ConditionalModule.registerWhen`, keyed on `STORAGE_DRIVER`. The DB connection itself moves behind a conditionally-imported `SequelizeConnectionModule`.

**Tech Stack:** NestJS 11, `@nestjs/cqrs`, `@nestjs/sequelize` + `sequelize-typescript` (Sequelize 6), `@nestjs/config` (new), Jest 30 + ts-jest.

## Global Constraints

- Env var `STORAGE_DRIVER`, values `sequelize` (default) | `memory`. Default (unset) MUST behave as `sequelize` — current behavior unchanged.
- `@nestjs/config@^4.0.4` (peer `@nestjs/common ^11`). `ConditionalModule` requires `ConfigModule.forRoot()` to be loaded.
- `ConditionalModule.registerWhen(module, condition)` is **async** (returns `Promise<DynamicModule>`, valid directly in an `imports` array) and re-exports the wrapped module's exports.
- In-memory repo impls MUST extend the existing `RepositoryImpl` base (unchanged) so `build()`/`commit()` and the CQRS event flow keep working.
- Path alias `@/` maps to `src/` (jest `moduleNameMapper` + tsconfig). Unit tests are `*.spec.ts` under `src/`; e2e tests are `*.e2e-spec.ts` under `test/`.
- Import ordering is enforced by `eslint-plugin-simple-import-sort`; run `npm run lint` before each commit.
- No changes to domain aggregates/entities/value-objects, events, sagas, emitters, controllers, or HTTP contracts.

---

## File Structure

**New shared files**
- `src/persistence/storage-driver.ts` — `isMemory` / `isSequelize` env predicates.
- `src/persistence/sequelize-unit-of-work.ts` — `SequelizeUnitOfWork` (wraps `sequelize.transaction`).
- `src/persistence/in-memory-unit-of-work.ts` — `InMemoryUnitOfWork` (invokes callback).
- `src/persistence/sequelize-connection.module.ts` — `SequelizeConnectionModule` (holds `SequelizeModule.forRoot`).

**Modified shared file**
- `src/utils/ddd.ts` — add `UnitOfWork` abstract class.

**Per feature (transaction, receipt)**
- `infra/${feature}-sequelize.repository-impl.ts` — add window-delete method.
- `infra/${feature}-in-memory.repository-impl.ts` — new in-memory repo.
- `infra/${feature}-sequelize.persistence-module.ts` — new.
- `infra/${feature}-in-memory.persistence-module.ts` — new.
- `domain/${feature}.repository.ts` — add window-delete abstract method.
- `${feature}.module.ts` — rewire via `ConditionalModule`.
- `usecase/create-*.handler.ts`, `usecase/delete-*.handler.ts` — consume ports.

**Reward**
- `domain/reward-query.repository.ts` — new read-port + read-model types.
- `infra/reward-query-sequelize.repository-impl.ts` — new (logic moved from query handler).
- `infra/reward.in-memory-store.ts` — new shared store.
- `infra/reward-session-in-memory.repository-impl.ts` — new.
- `infra/reward-query-in-memory.repository-impl.ts` — new.
- `infra/reward-in-memory.seed.ts` — new (ports the DB seeder).
- `infra/reward-sequelize.persistence-module.ts` / `infra/reward-in-memory.persistence-module.ts` — new.
- `reward.module.ts` — rewire; `usecase/*` reward handlers — consume ports.

**App**
- `src/app.module.ts` — add `ConfigModule.forRoot`, conditional connection.
- `test/memory-mode.e2e-spec.ts` — new DB-free boot test.
- `README.md` — document the driver.

---

## Task 1: Shared ports and driver predicates

**Files:**
- Modify: `src/utils/ddd.ts` (append `UnitOfWork`)
- Create: `src/persistence/storage-driver.ts`
- Create: `src/persistence/in-memory-unit-of-work.ts`
- Create: `src/persistence/sequelize-unit-of-work.ts`
- Test: `src/persistence/in-memory-unit-of-work.spec.ts`

**Interfaces:**
- Produces: `abstract class UnitOfWork { run<T>(work: () => Promise<T>): Promise<T> }` (token in `@/utils/ddd`); `isMemory(env)`, `isSequelize(env)` from `@/persistence/storage-driver`; `InMemoryUnitOfWork`, `SequelizeUnitOfWork` classes.

- [ ] **Step 1: Add the `UnitOfWork` port to `src/utils/ddd.ts`**

Append to the end of `src/utils/ddd.ts`:

```ts
/**
 * Backend-agnostic unit of work. The Sequelize impl runs `work` inside a
 * database transaction; the in-memory impl just invokes it.
 */
export abstract class UnitOfWork {
  public abstract run<T>(work: () => Promise<T>): Promise<T>;
}
```

- [ ] **Step 2: Create the driver predicates**

Create `src/persistence/storage-driver.ts`:

```ts
export const STORAGE_DRIVER_ENV = 'STORAGE_DRIVER';

/** True when the app should use the in-memory persistence backend. */
export const isMemory = (env: NodeJS.ProcessEnv): boolean =>
  env[STORAGE_DRIVER_ENV] === 'memory';

/** True when the app should use the Sequelize (database) backend (default). */
export const isSequelize = (env: NodeJS.ProcessEnv): boolean => !isMemory(env);
```

- [ ] **Step 3: Create the in-memory unit of work**

Create `src/persistence/in-memory-unit-of-work.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { UnitOfWork } from '@/utils/ddd';

@Injectable()
export class InMemoryUnitOfWork extends UnitOfWork {
  public run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
```

- [ ] **Step 4: Create the Sequelize unit of work**

Create `src/persistence/sequelize-unit-of-work.ts`:

```ts
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
```

- [ ] **Step 5: Write the failing test**

Create `src/persistence/in-memory-unit-of-work.spec.ts`:

```ts
import { InMemoryUnitOfWork } from './in-memory-unit-of-work';

describe('InMemoryUnitOfWork', () => {
  it('runs the work callback and returns its result', async () => {
    const uow = new InMemoryUnitOfWork();
    const work = jest.fn(() => Promise.resolve('done'));

    const result = await uow.run(work);

    expect(work).toHaveBeenCalledTimes(1);
    expect(result).toBe('done');
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/persistence/in-memory-unit-of-work.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add src/utils/ddd.ts src/persistence
git commit -m "feat(persistence): add UnitOfWork port, driver predicates, and UoW impls"
```

---

## Task 2: Register `ConfigModule` (keep DB connection as-is)

Adds `@nestjs/config` and `ConfigModule.forRoot` so later tasks can use `ConditionalModule`. The Sequelize connection stays wired directly in `app.module` for now, so the app still boots in the default (sequelize) mode after this task.

**Files:**
- Modify: `package.json` (dependency)
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: none.
- Produces: `ConfigModule` globally available (satisfies `ConditionalModule` in Tasks 3, 4, 6, 7).

- [ ] **Step 1: Install `@nestjs/config`**

Run: `npm install @nestjs/config@^4.0.4`
Expected: adds `@nestjs/config` to `dependencies`; `node_modules/@nestjs/config` exists.

- [ ] **Step 2: Add `ConfigModule.forRoot` to `AppModule`**

In `src/app.module.ts`, add the import and put `ConfigModule.forRoot({ isGlobal: true })` first in `imports` (leave the existing `SequelizeModule.forRoot(...)` and feature modules exactly as they are):

```ts
import { ConfigModule } from '@nestjs/config';
```

```ts
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // In production (Heroku) connect via DATABASE_URL over SSL; fall back to
    // local Postgres for development.
    SequelizeModule.forRoot(
      // ...unchanged...
    ),
    TransactionModule,
    RewardModule,
    ReceiptModule,
  ],
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: `nest build` succeeds with no TypeScript errors.

- [ ] **Step 4: Verify existing unit tests still pass**

Run: `npx jest`
Expected: PASS (no regressions).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app.module.ts
git commit -m "chore(config): add @nestjs/config and register ConfigModule"
```

---

## Task 3: Transaction — in-memory backend + rewire

**Files:**
- Modify: `src/transaction/domain/transaction.repository.ts`
- Modify: `src/transaction/infra/transaction-sequelize.repository-impl.ts`
- Create: `src/transaction/infra/transaction-in-memory.repository-impl.ts`
- Create: `src/transaction/infra/transaction-sequelize.persistence-module.ts`
- Create: `src/transaction/infra/transaction-in-memory.persistence-module.ts`
- Modify: `src/transaction/transaction.module.ts`
- Modify: `src/transaction/usecase/create-transaction.handler.ts`
- Modify: `src/transaction/usecase/delete-transactions.handler.ts`
- Test: `src/transaction/infra/transaction-in-memory.repository-impl.spec.ts` (new)
- Test: `src/transaction/usecase/delete-transactions.handler.spec.ts` (rewrite)

**Interfaces:**
- Consumes: `UnitOfWork` (`@/utils/ddd`), `SequelizeUnitOfWork`, `InMemoryUnitOfWork`, `isMemory`/`isSequelize` (Task 1).
- Produces: `TransactionRepository.deleteByClearedWindow(from: Date, to: Date): Promise<void>`; `TransactionSequelizePersistenceModule`, `TransactionInMemoryPersistenceModule` (each exports `TransactionRepository`, `UnitOfWork`).

- [ ] **Step 1: Add `deleteByClearedWindow` to the repository interface**

In `src/transaction/domain/transaction.repository.ts`, add the abstract method:

```ts
export abstract class TransactionRepository extends Repository<TransactionAggregate> {
  public abstract build(transaction: ITransactionEntity): TransactionAggregate;
  public abstract deleteByClearedWindow(from: Date, to: Date): Promise<void>;
}
```

- [ ] **Step 2: Implement it in the Sequelize repo**

In `src/transaction/infra/transaction-sequelize.repository-impl.ts`, add `import { Op } from 'sequelize';` (top, with the other imports) and append this method to the class:

```ts
  public async deleteByClearedWindow(from: Date, to: Date): Promise<void> {
    await this.transactionSequelize.destroy({
      where: { clearedAt: { [Op.gte]: from, [Op.lt]: to } },
    });
  }
```

- [ ] **Step 3: Write the failing in-memory repo test**

Create `src/transaction/infra/transaction-in-memory.repository-impl.spec.ts`:

```ts
import { TransactionType } from '../types';
import { TransactionInMemoryRepositoryImpl } from './transaction-in-memory.repository-impl';

const makeRepo = () => {
  const repo = new TransactionInMemoryRepositoryImpl({
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

const makeTx = (id: string, clearedAt: Date) => ({
  id,
  organizationId: 'org-1',
  cardId: 'card-1',
  amount: 100,
  type: TransactionType.Spend,
  merchant: 'Acme',
  clearedAt,
});

describe('TransactionInMemoryRepositoryImpl', () => {
  it('saves a transaction and finds it by id', async () => {
    const repo = makeRepo();
    await repo.save(repo.build(makeTx('t1', new Date('2026-07-10T00:00:00.000Z'))));

    const found = await repo.findOneById('t1');
    expect(found.toJSON().root.id).toBe('t1');
  });

  it('deletes only transactions cleared within [from, to)', async () => {
    const repo = makeRepo();
    await repo.save(repo.build(makeTx('in', new Date('2026-07-10T00:00:00.000Z'))));
    await repo.save(repo.build(makeTx('out', new Date('2026-08-10T00:00:00.000Z'))));

    await repo.deleteByClearedWindow(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
    );

    await expect(repo.findOneById('in')).rejects.toThrow('not found');
    expect((await repo.findOneById('out')).toJSON().root.id).toBe('out');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest src/transaction/infra/transaction-in-memory.repository-impl.spec.ts`
Expected: FAIL — cannot find module `./transaction-in-memory.repository-impl`.

- [ ] **Step 5: Implement the in-memory repo**

Create `src/transaction/infra/transaction-in-memory.repository-impl.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { RepositoryImpl } from '@/utils/ddd';

import { TransactionAggregate } from '../domain/transaction.aggregate';
import { ITransactionEntity } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class TransactionInMemoryRepositoryImpl
  extends RepositoryImpl<typeof TransactionAggregate>
  implements TransactionRepository
{
  private readonly store = new Map<string, ITransactionEntity>();

  public constructor(eventPublisher: EventPublisher) {
    super(TransactionAggregate, eventPublisher);
  }

  public build(transaction: ITransactionEntity): TransactionAggregate {
    return new this.AggregateClass(transaction);
  }

  public findOneById(id: string): Promise<TransactionAggregate> {
    const record = this.store.get(id);
    if (!record) {
      throw new Error(`transaction (id=${id}) not found`);
    }
    return Promise.resolve(this.build(record));
  }

  public save(transaction: TransactionAggregate): Promise<void> {
    const { root } = transaction.toJSON();
    this.store.set(root.id, { ...root });
    return Promise.resolve();
  }

  public deleteByClearedWindow(from: Date, to: Date): Promise<void> {
    for (const [id, record] of this.store) {
      if (record.clearedAt >= from && record.clearedAt < to) {
        this.store.delete(id);
      }
    }
    return Promise.resolve();
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/transaction/infra/transaction-in-memory.repository-impl.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Create the two persistence modules**

Create `src/transaction/infra/transaction-sequelize.persistence-module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { TransactionRepository } from '../domain/transaction.repository';
import { TransactionSequelize } from './transaction.sequelize';
import { TransactionSequelizeRepositoryImpl } from './transaction-sequelize.repository-impl';

@Module({
  imports: [SequelizeModule.forFeature([TransactionSequelize])],
  providers: [
    { provide: TransactionRepository, useClass: TransactionSequelizeRepositoryImpl },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [TransactionRepository, UnitOfWork],
})
export class TransactionSequelizePersistenceModule {}
```

Create `src/transaction/infra/transaction-in-memory.persistence-module.ts`:

```ts
import { Module } from '@nestjs/common';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { TransactionRepository } from '../domain/transaction.repository';
import { TransactionInMemoryRepositoryImpl } from './transaction-in-memory.repository-impl';

@Module({
  providers: [
    { provide: TransactionRepository, useClass: TransactionInMemoryRepositoryImpl },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [TransactionRepository, UnitOfWork],
})
export class TransactionInMemoryPersistenceModule {}
```

- [ ] **Step 8: Rewire `TransactionModule`**

Replace the entire body of `src/transaction/transaction.module.ts`:

```ts
import { ConditionalModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { TransactionInMemoryPersistenceModule } from './infra/transaction-in-memory.persistence-module';
import { TransactionSequelizePersistenceModule } from './infra/transaction-sequelize.persistence-module';
import { TransactionController } from './transaction.controller';
import { CreateTransactionHandler } from './usecase/create-transaction.handler';
import { DeleteTransactionsHandler } from './usecase/delete-transactions.handler';

@Module({
  imports: [
    CqrsModule,
    ConditionalModule.registerWhen(TransactionSequelizePersistenceModule, isSequelize),
    ConditionalModule.registerWhen(TransactionInMemoryPersistenceModule, isMemory),
  ],
  controllers: [TransactionController],
  providers: [CreateTransactionHandler, DeleteTransactionsHandler],
})
export class TransactionModule {}
```

- [ ] **Step 9: Refactor `CreateTransactionHandler` to use `UnitOfWork`**

Replace the entire body of `src/transaction/usecase/create-transaction.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { UnitOfWork } from '@/utils/ddd';

import { TransactionRepository } from '../domain/transaction.repository';
import { CreateTransactionCommand } from './create-transaction.command';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<CreateTransactionCommand> {
  public constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateTransactionCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const transaction = this.transactionRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        cardId: command.cardId,
        amount: command.amount,
        type: command.type,
        merchant: command.merchant,
        clearedAt: command.clearedTime,
      });
      transaction.create();
      await this.transactionRepository.save(transaction);
      transaction.commit();
    });
  }
}
```

- [ ] **Step 10: Refactor `DeleteTransactionsHandler` to use the repository**

Replace the entire body of `src/transaction/usecase/delete-transactions.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { TransactionRepository } from '../domain/transaction.repository';
import { DeleteTransactionsCommand } from './delete-transactions.command';

@CommandHandler(DeleteTransactionsCommand)
export class DeleteTransactionsHandler implements ICommandHandler<DeleteTransactionsCommand> {
  public constructor(
    private readonly transactionRepository: TransactionRepository,
  ) {}

  public async execute(command: DeleteTransactionsCommand): Promise<void> {
    await this.transactionRepository.deleteByClearedWindow(command.from, command.to);
  }
}
```

- [ ] **Step 11: Rewrite the delete handler spec**

Replace the entire body of `src/transaction/usecase/delete-transactions.handler.spec.ts`:

```ts
import { DeleteTransactionsCommand } from './delete-transactions.command';
import { DeleteTransactionsHandler } from './delete-transactions.handler';

describe('DeleteTransactionsHandler', () => {
  it('delegates to the repository window delete', async () => {
    const transactionRepository = {
      deleteByClearedWindow: jest.fn(() => Promise.resolve()),
    };
    const handler = new DeleteTransactionsHandler(transactionRepository as never);

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteTransactionsCommand({ from, to }));

    expect(transactionRepository.deleteByClearedWindow).toHaveBeenCalledWith(from, to);
  });
});
```

- [ ] **Step 12: Run the transaction tests + build**

Run: `npx jest src/transaction && npm run build`
Expected: all transaction specs PASS; build succeeds.

- [ ] **Step 13: Lint and commit**

```bash
npm run lint
git add src/transaction
git commit -m "feat(transaction): add in-memory backend and conditional persistence wiring"
```

---

## Task 4: Receipt — in-memory backend + rewire

Mirrors Task 3. Receipts have no domain timestamp, so the in-memory store stamps `createdAt` on save to support the window delete (the DB uses Sequelize's managed `createdAt`).

**Files:**
- Modify: `src/receipt/domain/receipt.repository.ts`
- Modify: `src/receipt/infra/receipt-sequelize.repository-impl.ts`
- Create: `src/receipt/infra/receipt-in-memory.repository-impl.ts`
- Create: `src/receipt/infra/receipt-sequelize.persistence-module.ts`
- Create: `src/receipt/infra/receipt-in-memory.persistence-module.ts`
- Modify: `src/receipt/receipt.module.ts`
- Modify: `src/receipt/usecase/create-receipt.handler.ts`
- Modify: `src/receipt/usecase/delete-receipts.handler.ts`
- Test: `src/receipt/infra/receipt-in-memory.repository-impl.spec.ts` (new)
- Test: `src/receipt/usecase/delete-receipts.handler.spec.ts` (rewrite)

**Interfaces:**
- Consumes: `UnitOfWork`, `SequelizeUnitOfWork`, `InMemoryUnitOfWork`, `isMemory`/`isSequelize`.
- Produces: `ReceiptRepository.deleteByCreatedWindow(from: Date, to: Date): Promise<void>`; `ReceiptSequelizePersistenceModule`, `ReceiptInMemoryPersistenceModule` (each exports `ReceiptRepository`, `UnitOfWork`).

- [ ] **Step 1: Add `deleteByCreatedWindow` to the repository interface**

In `src/receipt/domain/receipt.repository.ts`:

```ts
export abstract class ReceiptRepository extends Repository<ReceiptAggregate> {
  public abstract build(receipt: IReceiptEntity): ReceiptAggregate;
  public abstract deleteByCreatedWindow(from: Date, to: Date): Promise<void>;
}
```

- [ ] **Step 2: Implement it in the Sequelize repo**

In `src/receipt/infra/receipt-sequelize.repository-impl.ts`, add `import { Op, WhereOptions } from 'sequelize';` and append:

```ts
  public async deleteByCreatedWindow(from: Date, to: Date): Promise<void> {
    // createdAt is a Sequelize-managed timestamp, not in the typed attributes
    await this.receiptSequelize.destroy({
      where: { createdAt: { [Op.gte]: from, [Op.lt]: to } } as WhereOptions,
    });
  }
```

- [ ] **Step 3: Write the failing in-memory repo test**

Create `src/receipt/infra/receipt-in-memory.repository-impl.spec.ts`:

```ts
import { ReceiptInMemoryRepositoryImpl } from './receipt-in-memory.repository-impl';

const makeRepo = () => {
  const repo = new ReceiptInMemoryRepositoryImpl({
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

describe('ReceiptInMemoryRepositoryImpl', () => {
  it('saves a receipt and finds it by id', async () => {
    const repo = makeRepo();
    await repo.save(repo.build({ id: 'r1', organizationId: 'org-1', content: 'x' }));

    const found = await repo.findOneById('r1');
    expect(found.toJSON().root.id).toBe('r1');
  });

  it('deletes receipts created within [from, to)', async () => {
    const repo = makeRepo();
    await repo.save(repo.build({ id: 'r1', organizationId: 'org-1', content: 'x' }));

    // createdAt is stamped "now" on save; a window ending in the past deletes nothing
    await repo.deleteByCreatedWindow(
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2000-02-01T00:00:00.000Z'),
    );
    expect((await repo.findOneById('r1')).toJSON().root.id).toBe('r1');

    // a window spanning the present deletes it
    await repo.deleteByCreatedWindow(
      new Date('2000-01-01T00:00:00.000Z'),
      new Date('2999-01-01T00:00:00.000Z'),
    );
    await expect(repo.findOneById('r1')).rejects.toThrow('not found');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest src/receipt/infra/receipt-in-memory.repository-impl.spec.ts`
Expected: FAIL — cannot find module `./receipt-in-memory.repository-impl`.

- [ ] **Step 5: Implement the in-memory repo**

Create `src/receipt/infra/receipt-in-memory.repository-impl.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { RepositoryImpl } from '@/utils/ddd';

import { ReceiptAggregate } from '../domain/receipt.aggregate';
import { IReceiptEntity } from '../domain/receipt.entity';
import { ReceiptRepository } from '../domain/receipt.repository';

interface IStoredReceipt {
  root: IReceiptEntity;
  createdAt: Date;
}

@Injectable()
export class ReceiptInMemoryRepositoryImpl
  extends RepositoryImpl<typeof ReceiptAggregate>
  implements ReceiptRepository
{
  private readonly store = new Map<string, IStoredReceipt>();

  public constructor(eventPublisher: EventPublisher) {
    super(ReceiptAggregate, eventPublisher);
  }

  public build(receipt: IReceiptEntity): ReceiptAggregate {
    return new this.AggregateClass(receipt);
  }

  public findOneById(id: string): Promise<ReceiptAggregate> {
    const record = this.store.get(id);
    if (!record) {
      // Reject (do not throw synchronously) so callers and `rejects.toThrow`
      // assertions see a rejected promise rather than a sync exception.
      return Promise.reject(new Error(`receipt (id=${id}) not found`));
    }
    return Promise.resolve(this.build(record.root));
  }

  public save(receipt: ReceiptAggregate): Promise<void> {
    const { root } = receipt.toJSON();
    const existing = this.store.get(root.id);
    this.store.set(root.id, {
      root: { ...root },
      createdAt: existing?.createdAt ?? new Date(),
    });
    return Promise.resolve();
  }

  public deleteByCreatedWindow(from: Date, to: Date): Promise<void> {
    for (const [id, record] of this.store) {
      if (record.createdAt >= from && record.createdAt < to) {
        this.store.delete(id);
      }
    }
    return Promise.resolve();
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/receipt/infra/receipt-in-memory.repository-impl.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Create the two persistence modules**

Create `src/receipt/infra/receipt-sequelize.persistence-module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { ReceiptSequelize } from './receipt.sequelize';
import { ReceiptSequelizeRepositoryImpl } from './receipt-sequelize.repository-impl';

@Module({
  imports: [CqrsModule, SequelizeModule.forFeature([ReceiptSequelize])],
  providers: [
    { provide: ReceiptRepository, useClass: ReceiptSequelizeRepositoryImpl },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [ReceiptRepository, UnitOfWork],
})
export class ReceiptSequelizePersistenceModule {}
```

> `CqrsModule` is imported because `ReceiptSequelizeRepositoryImpl` extends `RepositoryImpl`, whose constructor injects `EventPublisher` (from `@nestjs/cqrs`). A persistence module only sees providers it declares or imports, so without this import DI fails at boot with `UnknownDependenciesException` for `EventPublisher`.

Create `src/receipt/infra/receipt-in-memory.persistence-module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { ReceiptInMemoryRepositoryImpl } from './receipt-in-memory.repository-impl';

@Module({
  imports: [CqrsModule],
  providers: [
    { provide: ReceiptRepository, useClass: ReceiptInMemoryRepositoryImpl },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [ReceiptRepository, UnitOfWork],
})
export class ReceiptInMemoryPersistenceModule {}
```

> `CqrsModule` is imported so `ReceiptInMemoryRepositoryImpl` (extends `RepositoryImpl`) can inject `EventPublisher`. See the note on the Sequelize persistence module above.

- [ ] **Step 8: Rewire `ReceiptModule`**

Replace the entire body of `src/receipt/receipt.module.ts`:

```ts
import { ConditionalModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { ReceiptInMemoryPersistenceModule } from './infra/receipt-in-memory.persistence-module';
import { ReceiptSequelizePersistenceModule } from './infra/receipt-sequelize.persistence-module';
import { ReceiptController } from './receipt.controller';
import { CreateReceiptHandler } from './usecase/create-receipt.handler';
import { DeleteReceiptsHandler } from './usecase/delete-receipts.handler';

@Module({
  imports: [
    CqrsModule,
    ConditionalModule.registerWhen(ReceiptSequelizePersistenceModule, isSequelize),
    ConditionalModule.registerWhen(ReceiptInMemoryPersistenceModule, isMemory),
  ],
  controllers: [ReceiptController],
  providers: [CreateReceiptHandler, DeleteReceiptsHandler],
})
export class ReceiptModule {}
```

- [ ] **Step 9: Refactor `CreateReceiptHandler`**

Replace the entire body of `src/receipt/usecase/create-receipt.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { UnitOfWork } from '@/utils/ddd';

import { ReceiptRepository } from '../domain/receipt.repository';
import { CreateReceiptCommand } from './create-receipt.command';

@CommandHandler(CreateReceiptCommand)
export class CreateReceiptHandler implements ICommandHandler<CreateReceiptCommand> {
  public constructor(
    private readonly receiptRepository: ReceiptRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateReceiptCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const receipt = this.receiptRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        content: command.content,
      });
      receipt.create();
      await this.receiptRepository.save(receipt);
      receipt.commit();
    });
  }
}
```

- [ ] **Step 10: Refactor `DeleteReceiptsHandler`**

Replace the entire body of `src/receipt/usecase/delete-receipts.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ReceiptRepository } from '../domain/receipt.repository';
import { DeleteReceiptsCommand } from './delete-receipts.command';

@CommandHandler(DeleteReceiptsCommand)
export class DeleteReceiptsHandler implements ICommandHandler<DeleteReceiptsCommand> {
  public constructor(private readonly receiptRepository: ReceiptRepository) {}

  public async execute(command: DeleteReceiptsCommand): Promise<void> {
    await this.receiptRepository.deleteByCreatedWindow(command.from, command.to);
  }
}
```

- [ ] **Step 11: Rewrite the delete handler spec**

Replace the entire body of `src/receipt/usecase/delete-receipts.handler.spec.ts`:

```ts
import { DeleteReceiptsCommand } from './delete-receipts.command';
import { DeleteReceiptsHandler } from './delete-receipts.handler';

describe('DeleteReceiptsHandler', () => {
  it('delegates to the repository window delete', async () => {
    const receiptRepository = {
      deleteByCreatedWindow: jest.fn(() => Promise.resolve()),
    };
    const handler = new DeleteReceiptsHandler(receiptRepository as never);

    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(new DeleteReceiptsCommand({ from, to }));

    expect(receiptRepository.deleteByCreatedWindow).toHaveBeenCalledWith(from, to);
  });
});
```

- [ ] **Step 12: Run the receipt tests + build**

Run: `npx jest src/receipt && npm run build`
Expected: all receipt specs PASS; build succeeds.

- [ ] **Step 13: Lint and commit**

```bash
npm run lint
git add src/receipt
git commit -m "feat(receipt): add in-memory backend and conditional persistence wiring"
```

---

## Task 5: Reward — read-port, in-memory store, repos, seed

Builds the reward in-memory pieces and the `RewardQueryRepository` read-port with both impls. No wiring yet (done in Task 6), so the app stays on the Sequelize path and green throughout.

**Files:**
- Create: `src/reward/domain/reward-query.repository.ts`
- Create: `src/reward/infra/reward.in-memory-store.ts`
- Create: `src/reward/infra/reward-query-sequelize.repository-impl.ts`
- Create: `src/reward/infra/reward-query-in-memory.repository-impl.ts`
- Create: `src/reward/infra/reward-session-in-memory.repository-impl.ts`
- Create: `src/reward/infra/reward-in-memory.seed.ts`
- Test: `src/reward/infra/reward-session-in-memory.repository-impl.spec.ts` (new)
- Test: `src/reward/infra/reward-query-in-memory.repository-impl.spec.ts` (new)

**Interfaces:**
- Consumes: `RewardSessionAggregate`, `IRewardSessionEntity`, `PointRewardedEvent`, `PointType`, `RewardSource`, `OrganizationSequelize`, `PointSequelize`, `RewardSessionSequelize`.
- Produces:
  - `abstract class RewardQueryRepository { getDemoData(): Promise<IRewardDemoReadModel> }`
  - `interface IRewardDemoReadModel { organizations: IRewardQueryOrganization[]; sessions: IRewardQuerySession[] }`
  - `interface IRewardQueryOrganization { id: string; name: string; creditLimit: number }`
  - `interface IRewardQuerySession { id, organizationId, startTime, endTime, totalTransactionAmount, totalReceiptCount, totalTransactionPointAmount, totalReceiptPointAmount }` (all fields; numbers except id/organizationId strings, startTime/endTime `Date`)
  - `class RewardInMemoryStore { organizations: Map<string, IStoredOrganization>; sessions: Map<string, IStoredSession>; points: IStoredPoint[] }`
  - `function seedRewardStore(store: RewardInMemoryStore): void`
  - `RewardQuerySequelizeRepositoryImpl`, `RewardQueryInMemoryRepositoryImpl`, `RewardSessionInMemoryRepositoryImpl`.

- [ ] **Step 1: Create the read-port**

Create `src/reward/domain/reward-query.repository.ts`:

```ts
export interface IRewardQueryOrganization {
  id: string;
  name: string;
  creditLimit: number;
}

export interface IRewardQuerySession {
  id: string;
  organizationId: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
  totalTransactionPointAmount: number;
  totalReceiptPointAmount: number;
}

export interface IRewardDemoReadModel {
  organizations: IRewardQueryOrganization[];
  sessions: IRewardQuerySession[];
}

/**
 * Read-side port for the demo page. Returns organizations and reward sessions
 * with persisted totals and point subtotals — WITHOUT reward policies, which
 * are domain defaults enriched by the query handler.
 *
 * Abstract class so it can be a NestJS DI token.
 */
export abstract class RewardQueryRepository {
  public abstract getDemoData(): Promise<IRewardDemoReadModel>;
}
```

- [ ] **Step 2: Create the in-memory store**

Create `src/reward/infra/reward.in-memory-store.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { PointType, RewardSource } from '../types';

export interface IStoredOrganization {
  id: string;
  name: string;
  creditLimit: number;
}

export interface IStoredSession {
  id: string;
  organizationId: string;
  startTime: Date;
  endTime: Date;
  totalTransactionAmount: number;
  totalReceiptCount: number;
}

export interface IStoredPoint {
  id: string;
  type: PointType;
  source: RewardSource;
  amount: number;
  organizationId: string;
  rewardSessionId: string;
}

/**
 * Shared in-memory backing store for the reward context, injected into both the
 * session repository and the query repository so they see the same data.
 */
@Injectable()
export class RewardInMemoryStore {
  public readonly organizations = new Map<string, IStoredOrganization>();
  public readonly sessions = new Map<string, IStoredSession>();
  public readonly points: IStoredPoint[] = [];
}
```

- [ ] **Step 3: Create the seed (port of `sequelize/seeders/20260706000000-demo.js`)**

Create `src/reward/infra/reward-in-memory.seed.ts`:

```ts
import { randomUUID } from 'crypto';

import { PointType, RewardSource } from '../types';
import { RewardInMemoryStore } from './reward.in-memory-store';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const ORGS = [
  { id: ORG_A, name: 'Acme Inc', creditLimit: 10000 },
  { id: ORG_B, name: 'Globex Corp', creditLimit: 50000 },
];

const SESSION_IDS: Record<string, string[]> = {
  [ORG_A]: [
    'a1a1a1a1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a2a2a2a2-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a3a3a3a3-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ],
  [ORG_B]: [
    'b1b1b1b1-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'b2b2b2b2-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'b3b3b3b3-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  ],
};

const SESSION_TOTALS: Record<
  string,
  { totalTransactionAmount: number; totalReceiptCount: number }[]
> = {
  [ORG_A]: [
    { totalTransactionAmount: 2500, totalReceiptCount: 4 },
    { totalTransactionAmount: 5000, totalReceiptCount: 10 },
    { totalTransactionAmount: 6500, totalReceiptCount: 12 },
  ],
  [ORG_B]: [
    { totalTransactionAmount: 5000, totalReceiptCount: 3 },
    { totalTransactionAmount: 12000, totalReceiptCount: 8 },
    { totalTransactionAmount: 22000, totalReceiptCount: 11 },
  ],
};

// Mirror RewardSessionEntity's default policies (reward-session.entity.ts).
const TRANSACTION_REWARD_POLICIES = [
  { threshold: 0.2, points: 300 },
  { threshold: 0.4, points: 600 },
  { threshold: 0.6, points: 900 },
];
const RECEIPT_REWARD_POLICIES = [{ threshold: 10, points: 100 }];

const earnedPoints = (
  policies: { threshold: number; points: number }[],
  value: number,
): number =>
  policies.filter((p) => p.threshold <= value).reduce((t, p) => t + p.points, 0);

// May, Jun, Jul 2026 (UTC), matching the DB seeder.
const month = (offset: number) => new Date(Date.UTC(2026, 4 + offset, 1));

/**
 * Populate the in-memory store with the same demo data the SQL seeder inserts,
 * so the demo page and reward flow work without a database.
 */
export function seedRewardStore(store: RewardInMemoryStore): void {
  for (const org of ORGS) {
    store.organizations.set(org.id, {
      id: org.id,
      name: org.name,
      creditLimit: org.creditLimit,
    });

    SESSION_TOTALS[org.id].forEach((totals, i) => {
      const sessionId = SESSION_IDS[org.id][i];
      store.sessions.set(sessionId, {
        id: sessionId,
        organizationId: org.id,
        startTime: month(i),
        endTime: month(i + 1),
        totalTransactionAmount: totals.totalTransactionAmount,
        totalReceiptCount: totals.totalReceiptCount,
      });

      const bySource: [RewardSource, number][] = [
        [
          RewardSource.Transaction,
          earnedPoints(
            TRANSACTION_REWARD_POLICIES,
            totals.totalTransactionAmount / org.creditLimit,
          ),
        ],
        [
          RewardSource.Receipt,
          earnedPoints(RECEIPT_REWARD_POLICIES, totals.totalReceiptCount),
        ],
      ];

      for (const [source, amount] of bySource) {
        if (amount <= 0) continue;
        store.points.push({
          id: randomUUID(),
          type: PointType.Rewards,
          source,
          amount,
          organizationId: org.id,
          rewardSessionId: sessionId,
        });
      }
    });
  }
}
```

- [ ] **Step 4: Create the Sequelize query repo (logic moved from the query handler)**

Create `src/reward/infra/reward-query-sequelize.repository-impl.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';

import {
  IRewardDemoReadModel,
  RewardQueryRepository,
} from '../domain/reward-query.repository';
import { RewardSource } from '../types';
import { OrganizationSequelize } from './organization.sequelize';
import { PointSequelize } from './point.sequelize';
import { RewardSessionSequelize } from './reward-session.sequelize';

interface IPointSumRow {
  rewardSessionId: string;
  organizationId: string;
  source: RewardSource;
  total: string | number;
}

@Injectable()
export class RewardQuerySequelizeRepositoryImpl implements RewardQueryRepository {
  public constructor(
    @InjectModel(OrganizationSequelize)
    private readonly organizationSequelize: typeof OrganizationSequelize,
    @InjectModel(RewardSessionSequelize)
    private readonly rewardSessionSequelize: typeof RewardSessionSequelize,
    @InjectModel(PointSequelize)
    private readonly pointSequelize: typeof PointSequelize,
  ) {}

  public async getDemoData(): Promise<IRewardDemoReadModel> {
    const [organizations, sessions, pointRows] = await Promise.all([
      this.organizationSequelize.findAll(),
      this.rewardSessionSequelize.findAll({ order: [['startTime', 'DESC']] }),
      this.pointSequelize.findAll({
        attributes: [
          'rewardSessionId',
          'organizationId',
          'source',
          [fn('SUM', col('amount')), 'total'],
        ],
        group: ['rewardSessionId', 'organizationId', 'source'],
        raw: true,
      }) as unknown as Promise<IPointSumRow[]>,
    ]);

    const pointsKey = (rewardSessionId: string, organizationId: string) =>
      `${rewardSessionId}::${organizationId}`;
    const pointsBySession = new Map<
      string,
      { transaction: number; receipt: number }
    >();
    for (const row of pointRows) {
      const key = pointsKey(row.rewardSessionId, row.organizationId);
      const entry = pointsBySession.get(key) ?? { transaction: 0, receipt: 0 };
      const amount = Number(row.total) || 0;
      if (row.source === RewardSource.Transaction) {
        entry.transaction = amount;
      } else if (row.source === RewardSource.Receipt) {
        entry.receipt = amount;
      }
      pointsBySession.set(key, entry);
    }

    return {
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        creditLimit: o.creditLimit,
      })),
      sessions: sessions.map((s) => {
        const points = pointsBySession.get(
          pointsKey(s.id, s.organizationId),
        ) ?? { transaction: 0, receipt: 0 };
        return {
          id: s.id,
          organizationId: s.organizationId,
          startTime: s.startTime,
          endTime: s.endTime,
          totalTransactionAmount: s.totalTransactionAmount,
          totalReceiptCount: s.totalReceiptCount,
          totalTransactionPointAmount: points.transaction,
          totalReceiptPointAmount: points.receipt,
        };
      }),
    };
  }
}
```

- [ ] **Step 5: Write the failing in-memory query repo test**

Create `src/reward/infra/reward-query-in-memory.repository-impl.spec.ts`:

```ts
import { RewardQueryInMemoryRepositoryImpl } from './reward-query-in-memory.repository-impl';
import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';

describe('RewardQueryInMemoryRepositoryImpl', () => {
  it('returns seeded organizations and sessions with point subtotals, newest first', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = new RewardQueryInMemoryRepositoryImpl(store);

    const { organizations, sessions } = await repo.getDemoData();

    expect(organizations).toHaveLength(2);
    expect(organizations.map((o) => o.name)).toContain('Acme Inc');

    // sessions sorted by startTime DESC
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i - 1].startTime.getTime()).toBeGreaterThanOrEqual(
        sessions[i].startTime.getTime(),
      );
    }

    // Globex third window (22000/50000 = 0.44 -> 300+600 = 900 transaction pts;
    // 11 receipts -> 100 receipt pts)
    const globexNewest = sessions.find(
      (s) => s.id === 'b3b3b3b3-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    );
    expect(globexNewest?.totalTransactionPointAmount).toBe(900);
    expect(globexNewest?.totalReceiptPointAmount).toBe(100);
  });

  it('reports zero subtotals for a session with no points', async () => {
    const store = new RewardInMemoryStore();
    store.organizations.set('org-1', { id: 'org-1', name: 'X', creditLimit: 1 });
    store.sessions.set('s1', {
      id: 's1',
      organizationId: 'org-1',
      startTime: new Date('2026-06-01T00:00:00.000Z'),
      endTime: new Date('2026-07-01T00:00:00.000Z'),
      totalTransactionAmount: 0,
      totalReceiptCount: 0,
    });
    const repo = new RewardQueryInMemoryRepositoryImpl(store);

    const { sessions } = await repo.getDemoData();

    expect(sessions[0].totalTransactionPointAmount).toBe(0);
    expect(sessions[0].totalReceiptPointAmount).toBe(0);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest src/reward/infra/reward-query-in-memory.repository-impl.spec.ts`
Expected: FAIL — cannot find module `./reward-query-in-memory.repository-impl`.

- [ ] **Step 7: Implement the in-memory query repo**

Create `src/reward/infra/reward-query-in-memory.repository-impl.ts`:

```ts
import { Injectable } from '@nestjs/common';

import {
  IRewardDemoReadModel,
  RewardQueryRepository,
} from '../domain/reward-query.repository';
import { RewardSource } from '../types';
import { RewardInMemoryStore } from './reward.in-memory-store';

@Injectable()
export class RewardQueryInMemoryRepositoryImpl implements RewardQueryRepository {
  public constructor(private readonly store: RewardInMemoryStore) {}

  public getDemoData(): Promise<IRewardDemoReadModel> {
    const sumBy = (
      rewardSessionId: string,
      organizationId: string,
      source: RewardSource,
    ) =>
      this.store.points
        .filter(
          (p) =>
            p.rewardSessionId === rewardSessionId &&
            p.organizationId === organizationId &&
            p.source === source,
        )
        .reduce((total, p) => total + p.amount, 0);

    const sessions = [...this.store.sessions.values()]
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .map((s) => ({
        id: s.id,
        organizationId: s.organizationId,
        startTime: s.startTime,
        endTime: s.endTime,
        totalTransactionAmount: s.totalTransactionAmount,
        totalReceiptCount: s.totalReceiptCount,
        totalTransactionPointAmount: sumBy(
          s.id,
          s.organizationId,
          RewardSource.Transaction,
        ),
        totalReceiptPointAmount: sumBy(
          s.id,
          s.organizationId,
          RewardSource.Receipt,
        ),
      }));

    return Promise.resolve({
      organizations: [...this.store.organizations.values()].map((o) => ({
        id: o.id,
        name: o.name,
        creditLimit: o.creditLimit,
      })),
      sessions,
    });
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/reward/infra/reward-query-in-memory.repository-impl.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Write the failing in-memory session repo test**

Create `src/reward/infra/reward-session-in-memory.repository-impl.spec.ts`:

```ts
import { RewardSessionInMemoryRepositoryImpl } from './reward-session-in-memory.repository-impl';
import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';

const ORG_A = '11111111-1111-1111-1111-111111111111';

const makeRepo = (store: RewardInMemoryStore) => {
  const repo = new RewardSessionInMemoryRepositoryImpl(store, {
    mergeClassContext: <T>(cls: T) => cls,
  } as never);
  repo.onModuleInit();
  return repo;
};

describe('RewardSessionInMemoryRepositoryImpl', () => {
  it('finds the active session for an org at a given time, with point subtotals', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);

    // July 2026 window is the third seeded session for ORG_A
    const session = await repo.findOneActive(
      ORG_A,
      new Date('2026-07-15T00:00:00.000Z'),
    );
    const json = session.toJSON();

    expect(json.root.id).toBe('a3a3a3a3-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(json.root.organizationId).toBe(ORG_A);
  });

  it('throws when no active session exists for the time', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);

    await expect(
      repo.findOneActive(ORG_A, new Date('2030-01-01T00:00:00.000Z')),
    ).rejects.toThrow('active reward session');
  });

  it('deletes a session and its points', async () => {
    const store = new RewardInMemoryStore();
    seedRewardStore(store);
    const repo = makeRepo(store);
    const sessionId = 'a3a3a3a3-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    await repo.deleteById(sessionId);

    expect(store.sessions.has(sessionId)).toBe(false);
    expect(store.points.some((p) => p.rewardSessionId === sessionId)).toBe(false);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx jest src/reward/infra/reward-session-in-memory.repository-impl.spec.ts`
Expected: FAIL — cannot find module `./reward-session-in-memory.repository-impl`.

- [ ] **Step 11: Implement the in-memory session repo**

Create `src/reward/infra/reward-session-in-memory.repository-impl.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { RepositoryImpl } from '@/utils/ddd';

import { RewardSessionAggregate } from '../domain/reward-session.aggregate';
import { IRewardSessionEntity } from '../domain/reward-session.entity';
import { PointRewardedEvent } from '../domain/reward-session.event';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RewardSource } from '../types';
import { RewardInMemoryStore } from './reward.in-memory-store';

@Injectable()
export class RewardSessionInMemoryRepositoryImpl
  extends RepositoryImpl<typeof RewardSessionAggregate>
  implements RewardSessionRepository
{
  public constructor(
    private readonly store: RewardInMemoryStore,
    eventPublisher: EventPublisher,
  ) {
    super(RewardSessionAggregate, eventPublisher);
  }

  public findOneActive(
    organizationId: string,
    time: Date,
  ): Promise<RewardSessionAggregate> {
    const organization = this.store.organizations.get(organizationId);
    if (!organization) {
      // Reject rather than throw synchronously (this method is not `async`),
      // so callers and `rejects.toThrow` assertions see a rejected promise.
      return Promise.reject(
        new Error(`organization (id=${organizationId}) not found`),
      );
    }

    const session = [...this.store.sessions.values()].find(
      (s) =>
        s.organizationId === organizationId &&
        s.startTime <= time &&
        s.endTime > time,
    );
    if (!session) {
      return Promise.reject(
        new Error(
          `active reward session (organizationId=${organizationId}, ` +
            `time=${time.toISOString()}) not found`,
        ),
      );
    }

    return Promise.resolve(
      new this.AggregateClass(
        {
          ...session,
          totalTransactionPointAmount: this.sumPointAmount(
            session.id,
            organizationId,
            RewardSource.Transaction,
          ),
          totalReceiptPointAmount: this.sumPointAmount(
            session.id,
            organizationId,
            RewardSource.Receipt,
          ),
        },
        { id: organization.id, creditLimit: organization.creditLimit },
      ),
    );
  }

  public findOneById(id: string): Promise<RewardSessionAggregate> {
    const session = this.store.sessions.get(id);
    if (!session) {
      return Promise.reject(new Error(`reward session (id=${id}) not found`));
    }
    return Promise.resolve(
      this.build({
        ...session,
        totalTransactionPointAmount: this.sumPointAmount(
          id,
          session.organizationId,
          RewardSource.Transaction,
        ),
        totalReceiptPointAmount: this.sumPointAmount(
          id,
          session.organizationId,
          RewardSource.Receipt,
        ),
      }),
    );
  }

  public build(session: IRewardSessionEntity): RewardSessionAggregate {
    return new this.AggregateClass(session);
  }

  public deleteById(id: string): Promise<void> {
    this.store.sessions.delete(id);
    for (let i = this.store.points.length - 1; i >= 0; i--) {
      if (this.store.points[i].rewardSessionId === id) {
        this.store.points.splice(i, 1);
      }
    }
    return Promise.resolve();
  }

  public save(session: RewardSessionAggregate): Promise<void> {
    const { root } = session.toJSON();

    this.store.sessions.set(root.id, {
      id: root.id,
      organizationId: root.organizationId,
      startTime: root.startTime,
      endTime: root.endTime,
      totalTransactionAmount: root.totalTransactionAmount,
      totalReceiptCount: root.totalReceiptCount,
    });

    session
      .getUncommittedEvents()
      .filter((e): e is PointRewardedEvent => e instanceof PointRewardedEvent)
      .forEach((e) => {
        this.store.points.push({
          id: randomUUID(),
          amount: e.pointAmount,
          organizationId: e.organizationId,
          rewardSessionId: e.sessionId,
          type: e.type,
          source: e.source,
        });
      });

    return Promise.resolve();
  }

  private sumPointAmount(
    rewardSessionId: string,
    organizationId: string,
    source: RewardSource,
  ): number {
    return this.store.points
      .filter(
        (p) =>
          p.rewardSessionId === rewardSessionId &&
          p.organizationId === organizationId &&
          p.source === source,
      )
      .reduce((total, p) => total + p.amount, 0);
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx jest src/reward/infra/reward-session-in-memory.repository-impl.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 13: Build + full test run + lint + commit**

Run: `npm run build && npx jest && npm run lint`
Expected: build succeeds; all tests PASS (Task 6 rewiring not yet done, so the Sequelize query handler still works unchanged).

```bash
git add src/reward/domain/reward-query.repository.ts src/reward/infra
git commit -m "feat(reward): add in-memory store, session/query repos, read-port, and seed"
```

---

## Task 6: Reward — rewire module, handlers, and query

Swaps the reward wiring to the ports and moves the query handler onto `RewardQueryRepository`.

**Files:**
- Create: `src/reward/infra/reward-sequelize.persistence-module.ts`
- Create: `src/reward/infra/reward-in-memory.persistence-module.ts`
- Modify: `src/reward/reward.module.ts`
- Modify: `src/reward/usecase/get-reward-demo-data.handler.ts`
- Modify: `src/reward/usecase/create-reward-session.handler.ts`
- Modify: `src/reward/usecase/delete-reward-session.handler.ts`
- Modify: `src/reward/usecase/apply-transaction-reward.handler.ts`
- Modify: `src/reward/usecase/apply-receipt-reward.handler.ts`
- Test: `src/reward/usecase/get-reward-demo-data.handler.spec.ts` (rewrite)
- Test: `src/reward/usecase/create-reward-session.handler.spec.ts` (rewrite)
- Test: `src/reward/usecase/delete-reward-session.handler.spec.ts` (rewrite)

**Interfaces:**
- Consumes: everything from Task 5 plus `UnitOfWork`, `SequelizeUnitOfWork`, `InMemoryUnitOfWork`, `isMemory`/`isSequelize`, `RewardSessionSequelizeRepositoryImpl` (existing).
- Produces: `RewardSequelizePersistenceModule`, `RewardInMemoryPersistenceModule` (each exports `RewardSessionRepository`, `RewardQueryRepository`, `UnitOfWork`).

- [ ] **Step 1: Create the Sequelize persistence module**

Create `src/reward/infra/reward-sequelize.persistence-module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SequelizeModule } from '@nestjs/sequelize';

import { SequelizeUnitOfWork } from '@/persistence/sequelize-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { OrganizationSequelize } from './organization.sequelize';
import { PointSequelize } from './point.sequelize';
import { RewardSessionSequelize } from './reward-session.sequelize';
import { RewardQuerySequelizeRepositoryImpl } from './reward-query-sequelize.repository-impl';
import { RewardSessionSequelizeRepositoryImpl } from './reward-session-sequelize.repository-impl';

@Module({
  imports: [
    CqrsModule,
    SequelizeModule.forFeature([
      OrganizationSequelize,
      PointSequelize,
      RewardSessionSequelize,
    ]),
  ],
  providers: [
    { provide: RewardSessionRepository, useClass: RewardSessionSequelizeRepositoryImpl },
    { provide: RewardQueryRepository, useClass: RewardQuerySequelizeRepositoryImpl },
    { provide: UnitOfWork, useClass: SequelizeUnitOfWork },
  ],
  exports: [RewardSessionRepository, RewardQueryRepository, UnitOfWork],
})
export class RewardSequelizePersistenceModule {}
```

- [ ] **Step 2: Create the in-memory persistence module (with seeding)**

Create `src/reward/infra/reward-in-memory.persistence-module.ts`:

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { InMemoryUnitOfWork } from '@/persistence/in-memory-unit-of-work';
import { UnitOfWork } from '@/utils/ddd';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionRepository } from '../domain/reward-session.repository';
import { RewardQueryInMemoryRepositoryImpl } from './reward-query-in-memory.repository-impl';
import { RewardSessionInMemoryRepositoryImpl } from './reward-session-in-memory.repository-impl';
import { RewardInMemoryStore } from './reward.in-memory-store';
import { seedRewardStore } from './reward-in-memory.seed';

@Module({
  imports: [CqrsModule],
  providers: [
    RewardInMemoryStore,
    { provide: RewardSessionRepository, useClass: RewardSessionInMemoryRepositoryImpl },
    { provide: RewardQueryRepository, useClass: RewardQueryInMemoryRepositoryImpl },
    { provide: UnitOfWork, useClass: InMemoryUnitOfWork },
  ],
  exports: [RewardSessionRepository, RewardQueryRepository, UnitOfWork],
})
export class RewardInMemoryPersistenceModule implements OnModuleInit {
  public constructor(private readonly store: RewardInMemoryStore) {}

  public onModuleInit(): void {
    seedRewardStore(this.store);
  }
}
```

- [ ] **Step 3: Rewire `RewardModule`**

Replace the `imports` and `providers` in `src/reward/reward.module.ts`. Remove the `SequelizeModule.forFeature([...])` import, the three model imports (`OrganizationSequelize`, `PointSequelize`, `RewardSessionSequelize`), the `RewardSessionSequelizeRepositoryImpl` import, and the `{ provide: RewardSessionRepository, useClass: ... }` provider. Add the conditional imports. Final file:

```ts
import { ConditionalModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { isMemory, isSequelize } from '@/persistence/storage-driver';

import { RewardInMemoryPersistenceModule } from './infra/reward-in-memory.persistence-module';
import { RewardSequelizePersistenceModule } from './infra/reward-sequelize.persistence-module';
import { RewardController } from './reward.controller';
import { ApplyReceiptRewardHandler } from './usecase/apply-receipt-reward.handler';
import { ApplyTransactionRewardHandler } from './usecase/apply-transaction-reward.handler';
import { CreateRewardSessionHandler } from './usecase/create-reward-session.handler';
import { DeleteRewardSessionHandler } from './usecase/delete-reward-session.handler';
import { GetRewardDemoDataHandler } from './usecase/get-reward-demo-data.handler';
import { PointRewardedEmitterHandler } from './usecase/point-rewarded.emitter-handler';
import { RecognizeReceiptHandler } from './usecase/recognize-receipt.handler';
import { RecognizeTransactionHandler } from './usecase/recognize-transaction.handler';
import { RewardSaga } from './usecase/reward.saga';
import { RewardEventsEmitter } from './usecase/reward-events.emitter';

@Module({
  imports: [
    CqrsModule,
    ConditionalModule.registerWhen(RewardSequelizePersistenceModule, isSequelize),
    ConditionalModule.registerWhen(RewardInMemoryPersistenceModule, isMemory),
  ],
  controllers: [RewardController],
  providers: [
    // command handlers
    ApplyReceiptRewardHandler,
    ApplyTransactionRewardHandler,
    CreateRewardSessionHandler,
    DeleteRewardSessionHandler,
    RecognizeReceiptHandler,
    RecognizeTransactionHandler,

    // query handlers
    GetRewardDemoDataHandler,

    // event handlers
    PointRewardedEmitterHandler,

    // sagas
    RewardSaga,

    // in-process emitter backing the SSE stream
    RewardEventsEmitter,
  ],
})
export class RewardModule {}
```

- [ ] **Step 4: Refactor `GetRewardDemoDataHandler` onto the read-port**

Replace the entire body of `src/reward/usecase/get-reward-demo-data.handler.ts`:

```ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { RewardQueryRepository } from '../domain/reward-query.repository';
import { RewardSessionEntity } from '../domain/reward-session.entity';
import {
  GetRewardDemoDataQuery,
  IRewardDemoData,
} from './get-reward-demo-data.query';

@QueryHandler(GetRewardDemoDataQuery)
export class GetRewardDemoDataHandler implements IQueryHandler<
  GetRewardDemoDataQuery,
  IRewardDemoData
> {
  public constructor(
    private readonly rewardQueryRepository: RewardQueryRepository,
  ) {}

  public async execute(): Promise<IRewardDemoData> {
    // Reward policies are the same defaults for every session.
    const policies = new RewardSessionEntity({});
    const { organizations, sessions } =
      await this.rewardQueryRepository.getDemoData();

    return {
      organizations,
      sessions: sessions.map((s) => ({
        ...s,
        transactionRewardPolicies: policies.transactionRewardPolicies.map(
          (p) => ({ threshold: p.threshold, points: p.points }),
        ),
        receiptRewardPolicies: policies.receiptRewardPolicies.map((p) => ({
          threshold: p.threshold,
          points: p.points,
        })),
      })),
    };
  }
}
```

- [ ] **Step 5: Refactor the four `sequelize.transaction` reward handlers**

In each of the four files, replace `import { Sequelize } from 'sequelize-typescript';` with `import { UnitOfWork } from '@/utils/ddd';`, change the constructor param `private readonly sequelize: Sequelize` to `private readonly unitOfWork: UnitOfWork`, and change `this.sequelize.transaction(` to `this.unitOfWork.run(`.

`src/reward/usecase/create-reward-session.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { CreateRewardSessionCommand } from './create-reward-session.command';

@CommandHandler(CreateRewardSessionCommand)
export class CreateRewardSessionHandler implements ICommandHandler<CreateRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateRewardSessionCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const session = this.rewardSessionRepository.build({
        id: randomUUID(),
        organizationId: command.organizationId,
        startTime: command.startTime,
        endTime: command.endTime,
        totalTransactionPointAmount: 0,
        totalReceiptPointAmount: 0,
        totalTransactionAmount: 0,
        totalReceiptCount: 0,
      });
      session.create();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
```

`src/reward/usecase/delete-reward-session.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { DeleteRewardSessionCommand } from './delete-reward-session.command';

@CommandHandler(DeleteRewardSessionCommand)
export class DeleteRewardSessionHandler implements ICommandHandler<DeleteRewardSessionCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: DeleteRewardSessionCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      await this.rewardSessionRepository.deleteById(command.sessionId);
    });
  }
}
```

`src/reward/usecase/apply-transaction-reward.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { ApplyTransactionRewardCommand } from './apply-transaction-reward.command';

@CommandHandler(ApplyTransactionRewardCommand)
export class ApplyTransactionRewardHandler implements ICommandHandler<ApplyTransactionRewardCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ApplyTransactionRewardCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.transaction.clearedTime,
      );
      session.applyTransactionReward();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
```

`src/reward/usecase/apply-receipt-reward.handler.ts`:

```ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UnitOfWork } from '@/utils/ddd';

import { RewardSessionRepository } from '../domain/reward-session.repository';
import { ApplyReceiptRewardCommand } from './apply-receipt-reward.command';

@CommandHandler(ApplyReceiptRewardCommand)
export class ApplyReceiptRewardHandler implements ICommandHandler<ApplyReceiptRewardCommand> {
  public constructor(
    private readonly rewardSessionRepository: RewardSessionRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ApplyReceiptRewardCommand): Promise<void> {
    await this.unitOfWork.run(async () => {
      const session = await this.rewardSessionRepository.findOneActive(
        command.organizationId,
        command.time,
      );
      session.applyReceiptReward();
      await this.rewardSessionRepository.save(session);
      session.commit();
    });
  }
}
```

- [ ] **Step 6: Rewrite the demo-data handler spec (mock the read-port)**

Replace the entire body of `src/reward/usecase/get-reward-demo-data.handler.spec.ts`:

```ts
import { GetRewardDemoDataHandler } from './get-reward-demo-data.handler';

describe('GetRewardDemoDataHandler', () => {
  it('returns the read model enriched with default reward policies', async () => {
    const rewardQueryRepository = {
      getDemoData: jest.fn(() =>
        Promise.resolve({
          organizations: [
            { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
            { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
          ],
          sessions: [
            {
              id: 'session-org1',
              organizationId: 'org-1',
              startTime: new Date('2026-07-01T00:00:00.000Z'),
              endTime: new Date('2026-08-01T00:00:00.000Z'),
              totalTransactionAmount: 2500,
              totalReceiptCount: 4,
              totalTransactionPointAmount: 1800,
              totalReceiptPointAmount: 0,
            },
          ],
        }),
      ),
    };

    const handler = new GetRewardDemoDataHandler(rewardQueryRepository as never);
    const result = await handler.execute();

    expect(result.organizations).toEqual([
      { id: 'org-1', name: 'Acme Inc', creditLimit: 10000 },
      { id: 'org-2', name: 'Globex Corp', creditLimit: 50000 },
    ]);
    expect(result.sessions[0]).toMatchObject({
      organizationId: 'org-1',
      totalTransactionAmount: 2500,
      totalTransactionPointAmount: 1800,
    });
    expect(result.sessions[0].transactionRewardPolicies).toEqual([
      { threshold: 0.2, points: 300 },
      { threshold: 0.4, points: 600 },
      { threshold: 0.6, points: 900 },
    ]);
    expect(result.sessions[0].receiptRewardPolicies).toEqual([
      { threshold: 10, points: 100 },
    ]);
  });
});
```

- [ ] **Step 7: Rewrite the create/delete reward-session specs (mock `UnitOfWork`)**

Replace the entire body of `src/reward/usecase/create-reward-session.handler.spec.ts`:

```ts
import { CreateRewardSessionCommand } from './create-reward-session.command';
import { CreateRewardSessionHandler } from './create-reward-session.handler';

describe('CreateRewardSessionHandler', () => {
  it('builds, creates, saves and commits in order with a generated id', async () => {
    const calls: string[] = [];

    const aggregate = {
      create: jest.fn(() => calls.push('create')),
      commit: jest.fn(() => calls.push('commit')),
    };

    let builtWith: unknown;
    const repository = {
      build: jest.fn((session: unknown) => {
        calls.push('build');
        builtWith = session;
        return aggregate;
      }),
      save: jest.fn(() => {
        calls.push('save');
        return Promise.resolve();
      }),
    };

    // mimic the unit of work by simply invoking the callback
    const unitOfWork = {
      run: jest.fn((work: () => Promise<unknown>) => work()),
    };

    const handler = new CreateRewardSessionHandler(
      repository as never,
      unitOfWork as never,
    );

    const startTime = new Date('2026-07-01T00:00:00.000Z');
    const endTime = new Date('2026-08-01T00:00:00.000Z');
    await handler.execute(
      new CreateRewardSessionCommand({
        organizationId: 'org-1',
        startTime,
        endTime,
      }),
    );

    expect(calls).toEqual(['build', 'create', 'save', 'commit']);
    expect(repository.save).toHaveBeenCalledWith(aggregate);
    expect(builtWith).toMatchObject({
      organizationId: 'org-1',
      startTime,
      endTime,
      totalTransactionPointAmount: 0,
      totalReceiptPointAmount: 0,
      totalTransactionAmount: 0,
      totalReceiptCount: 0,
    });
    expect(typeof (builtWith as { id: string }).id).toBe('string');
    expect((builtWith as { id: string }).id.length).toBeGreaterThan(0);
  });
});
```

Replace the entire body of `src/reward/usecase/delete-reward-session.handler.spec.ts`:

```ts
import { DeleteRewardSessionCommand } from './delete-reward-session.command';
import { DeleteRewardSessionHandler } from './delete-reward-session.handler';

describe('DeleteRewardSessionHandler', () => {
  it('deletes the session (and its points) inside a unit of work', async () => {
    const repository = { deleteById: jest.fn(() => Promise.resolve()) };
    const unitOfWork = {
      run: jest.fn((work: () => Promise<unknown>) => work()),
    };

    const handler = new DeleteRewardSessionHandler(
      repository as never,
      unitOfWork as never,
    );

    await handler.execute(
      new DeleteRewardSessionCommand({ sessionId: 'session-1' }),
    );

    expect(unitOfWork.run).toHaveBeenCalled();
    expect(repository.deleteById).toHaveBeenCalledWith('session-1');
  });
});
```

- [ ] **Step 8: Build + full test run**

Run: `npm run build && npx jest`
Expected: build succeeds; all specs PASS.

- [ ] **Step 9: Lint and commit**

```bash
npm run lint
git add src/reward
git commit -m "feat(reward): rewire to ports, move demo query to read-port, UnitOfWork handlers"
```

---

## Task 7: Conditional DB connection + DB-free boot verification

Moves the Postgres connection behind `ConditionalModule` so `memory` mode never opens a connection, and proves a DB-free boot end to end.

**Files:**
- Create: `src/persistence/sequelize-connection.module.ts`
- Modify: `src/app.module.ts`
- Test: `test/memory-mode.e2e-spec.ts` (new)
- Modify: `README.md`

**Interfaces:**
- Consumes: `isSequelize` (Task 1), the rewired feature modules (Tasks 3, 4, 6).
- Produces: DB-free boot under `STORAGE_DRIVER=memory`.

- [ ] **Step 1: Extract the connection into a module**

Create `src/persistence/sequelize-connection.module.ts` (move the exact `forRoot` config currently in `app.module.ts`):

```ts
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
```

- [ ] **Step 2: Rewire `app.module.ts`**

Replace the entire body of `src/app.module.ts`:

```ts
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { isSequelize } from './persistence/storage-driver';
import { SequelizeConnectionModule } from './persistence/sequelize-connection.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
```

- [ ] **Step 3: Write the DB-free boot e2e test**

Create `test/memory-mode.e2e-spec.ts`:

```ts
process.env.STORAGE_DRIVER = 'memory';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

const ORG_A = '11111111-1111-1111-1111-111111111111';

describe('Memory mode (e2e, no database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves seeded reward demo data', async () => {
    const res = await request(app.getHttpServer())
      .get('/reward-sessions')
      .expect(200);

    expect(res.body.organizations.length).toBe(2);
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('accepts a transaction without a database', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .send({
        organizationId: ORG_A,
        cardId: 'card-1',
        amount: 100,
        type: 'spend',
        merchant: 'Acme',
      })
      .expect(201);
  });
});
```

- [ ] **Step 4: Run the memory-mode e2e**

Run: `npm run test:e2e -- memory-mode`
Expected: PASS (2 tests) — the app boots, seeds, serves demo data, and accepts a transaction with no Postgres running.

> If it hangs ~5s then errors with "Nest was not able to resolve the config variables", `ConfigModule.forRoot` is missing or not first in `app.module` imports — fix ordering (Task 2 / Step 2 here).

- [ ] **Step 5: Verify Sequelize mode still builds and unit tests pass**

Run: `npm run build && npx jest`
Expected: build succeeds; all unit specs PASS. (The default `app.e2e-spec.ts` still needs Postgres; do not run it here unless a DB is available.)

- [ ] **Step 6: Document the driver in the README**

In `README.md`, under "Run", add a subsection:

```markdown
### Storage driver

The app selects its persistence backend at startup via `STORAGE_DRIVER`:

- `STORAGE_DRIVER=sequelize` (default) — Postgres via Sequelize. Requires the
  database, migrations, and seed described above.
- `STORAGE_DRIVER=memory` — in-memory store, no database required. The reward
  demo data is seeded automatically at boot; transactions and receipts start
  empty and do not persist across restarts.

```bash
$ STORAGE_DRIVER=memory npm run start
```
```

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add src/persistence/sequelize-connection.module.ts src/app.module.ts test/memory-mode.e2e-spec.ts README.md
git commit -m "feat(app): make database connection conditional; verify DB-free boot"
```

---

## Self-Review

**Spec coverage:**
- Driver `STORAGE_DRIVER=sequelize|memory`, default sequelize → Task 1 (predicates), Tasks 3/4/6/7 (usage). ✓
- `@nestjs/config` + `ConfigModule` → Task 2. ✓
- `UnitOfWork` port in `utils/ddd` + both impls → Task 1. ✓
- Three repositories gain in-memory variants → Tasks 3, 4, 5. ✓
- Window-delete moved behind repo interface → Tasks 3, 4. ✓
- `RewardQueryRepository` read-port + both impls; query handler rewired → Tasks 5, 6. ✓
- Per-feature `${Feature}Sequelize/InMemoryPersistenceModule`, feature modules rewired via `ConditionalModule.registerWhen`, infra providers removed → Tasks 3, 4, 6. ✓
- Conditional DB connection (`SequelizeConnectionModule`) → Task 7. ✓
- In-memory reward seeding on module init → Tasks 5 (seed), 6 (module). ✓
- Five broken specs updated → Tasks 3 (delete-transactions), 4 (delete-receipts), 6 (get-reward-demo-data, create-reward-session, delete-reward-session). ✓
- DB-free boot verification → Task 7. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". The one `void X;` lines are explicitly explained as lint-removal reminders. ✓

**Type consistency:** `UnitOfWork.run<T>(work: () => Promise<T>)` used identically everywhere. `deleteByClearedWindow`/`deleteByCreatedWindow(from, to)` consistent between interface, impls, handlers, and specs. `RewardQueryRepository.getDemoData(): Promise<IRewardDemoReadModel>` and `IRewardQuerySession` fields match what `GetRewardDemoDataHandler` spreads and what the in-memory/Sequelize impls return. Persistence module export lists match what feature-module handlers inject. ✓
