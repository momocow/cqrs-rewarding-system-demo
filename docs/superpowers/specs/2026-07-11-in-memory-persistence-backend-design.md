# In-Memory Persistence Backend — Design

Date: 2026-07-11

## Goal

Let the entire application boot and run **without a database**, backed entirely
by in-memory storage, selectable at startup. Every Sequelize repository
implementation gains an in-memory variant implementing the same repository
interface, and the non-repository Sequelize couplings are given
backend-agnostic seams so nothing reaches for Sequelize when the in-memory
driver is active.

The DB-backed driver is named `sequelize` (not `postgres`) because the concrete
database is a Sequelize configuration concern — Sequelize can target other
engines, so naming the driver after the ORM avoids implying Postgres.

## Driver selection

- Environment variable: `STORAGE_DRIVER`, values `sequelize` (default) | `memory`.
- Predicates used by `ConditionalModule.registerWhen`:
  - `isMemory = (env: NodeJS.ProcessEnv) => env.STORAGE_DRIVER === 'memory'`
  - `isSequelize = (env: NodeJS.ProcessEnv) => env.STORAGE_DRIVER !== 'memory'`
- Default (`STORAGE_DRIVER` unset) is `sequelize`, so current behavior is
  unchanged unless the operator opts into `memory`.

`ConditionalModule` lives in `@nestjs/config`, which is **not currently
installed** and must be added. `ConditionalModule` requires `ConfigModule` to be
loaded, so `ConfigModule.forRoot()` is added to `AppModule`.

## The seam (backend-agnostic ports)

Four kinds of ports, each with a Sequelize impl and an in-memory impl. The
in-memory repository impls continue to extend the existing `RepositoryImpl`
base (which is already backend-agnostic — it only needs `EventPublisher` for
`build()`/`commit()`), so the CQRS event flow is unchanged.

| Port (abstract class / DI token) | Sequelize impl | In-memory impl |
| --- | --- | --- |
| `TransactionRepository` (+ new `deleteByClearedWindow(from, to)`) | existing, extended | new |
| `ReceiptRepository` (+ new `deleteByCreatedWindow(from, to)`) | existing, extended | new |
| `RewardSessionRepository` (already has `deleteById`) | existing | new |
| `RewardQueryRepository` — **new** read-port, `getDemoData()` | new (logic moved out of `GetRewardDemoDataHandler`) | new |
| `UnitOfWork` — **new** port, `run<T>(work: () => Promise<T>): Promise<T>` | new (wraps `sequelize.transaction`) | new (invokes the callback directly) |

### `UnitOfWork`

Defined in `src/utils/ddd.ts` alongside `Repository`/`RepositoryImpl`:

```ts
export abstract class UnitOfWork {
  public abstract run<T>(work: () => Promise<T>): Promise<T>;
}
```

- `SequelizeUnitOfWork` injects `Sequelize` and implements `run` as
  `this.sequelize.transaction(work)`. CLS (`src/setup.ts`) remains required for
  the Sequelize path so the transaction propagates to model calls that don't
  pass it explicitly.
- `InMemoryUnitOfWork.run(work)` simply returns `work()`.

### `RewardQueryRepository`

New read-port at `src/reward/domain/reward-query.repository.ts`. `getDemoData()`
returns organizations plus reward sessions with their persisted totals and point
subtotals — **without** reward policies. The reward-policy defaults are domain
knowledge and stay in the usecase layer: `GetRewardDemoDataHandler` enriches each
returned session with the defaults from `RewardSessionEntity`. This keeps both
infra impls limited to data access + point summing and avoids duplicating policy
defaults across backends.

## Per-feature nested persistence modules

Each feature gains two nested modules that **provide and export** that feature's
ports. Naming follows `${Feature}SequelizePersistenceModule` /
`${Feature}InMemoryPersistenceModule`:

- `TransactionSequelizePersistenceModule` / `TransactionInMemoryPersistenceModule`
- `ReceiptSequelizePersistenceModule` / `ReceiptInMemoryPersistenceModule`
- `RewardSequelizePersistenceModule` / `RewardInMemoryPersistenceModule`

The `*Sequelize*` modules hold `SequelizeModule.forFeature([...])` (moved out of
the feature modules) and bind each interface token to its Sequelize impl. The
`*InMemory*` modules provide an injectable in-memory store (Maps) shared between
that feature's repo impl and — for reward — its query impl.

Exports per persistence module:

- Transaction: `TransactionRepository`, `UnitOfWork`
- Receipt: `ReceiptRepository`, `UnitOfWork`
- Reward: `RewardSessionRepository`, `RewardQueryRepository`, `UnitOfWork`

## Feature module rewiring

Feature modules lose their infra providers and their `SequelizeModule.forFeature`
imports. Instead they conditionally import both persistence modules, e.g. in
`RewardModule`:

```ts
imports: [
  CqrsModule,
  ConditionalModule.registerWhen(RewardSequelizePersistenceModule, isSequelize),
  ConditionalModule.registerWhen(RewardInMemoryPersistenceModule, isMemory),
],
```

**Risk to validate during implementation:** `ConditionalModule.registerWhen`
must re-export the wrapped module's exports so the feature module's handlers can
inject the ports. This is expected to work (it is the feature's purpose), but it
will be verified against the installed `@nestjs/config` source; if it does not,
the fallback is a thin wrapper module that imports + re-exports the chosen
persistence module.

## Handler refactors

- The 6 create/apply/delete handlers that inject `Sequelize` and call
  `this.sequelize.transaction(cb)` instead inject `UnitOfWork` and call
  `this.unitOfWork.run(cb)`:
  `CreateTransactionHandler`, `CreateReceiptHandler`,
  `CreateRewardSessionHandler`, `DeleteRewardSessionHandler`,
  `ApplyTransactionRewardHandler`, `ApplyReceiptRewardHandler`.
- `DeleteTransactionsHandler` / `DeleteReceiptsHandler`: inject the repository
  and call the new `deleteByClearedWindow` / `deleteByCreatedWindow` method
  instead of `Model.destroy`.
- `GetRewardDemoDataHandler`: inject `RewardQueryRepository`, delegate to
  `getDemoData()`, and enrich each session with the default reward policies.

## App bootstrap

- Add `@nestjs/config` dependency; add `ConfigModule.forRoot()` to `AppModule`.
- Move `SequelizeModule.forRoot(...)` into a new `SequelizeConnectionModule`,
  imported via `ConditionalModule.registerWhen(SequelizeConnectionModule, isSequelize)`.
  In memory mode the app never opens a Postgres connection.
- `src/setup.ts` (Sequelize CLS namespace) is left as-is; it is only relevant to
  the Sequelize path and is harmless when the memory driver is active.

## Seeding

The DB seeder (`sequelize/seeders/20260706000000-demo.js`) seeds only
organizations, reward sessions, and points. Therefore **only**
`RewardInMemoryPersistenceModule` seeds: its seed logic is ported to TypeScript
and populates the reward in-memory store on `onModuleInit`, mirroring the demo
organizations, per-org/per-window sessions, and earned points. Transaction and
receipt in-memory stores start empty, matching the database.

Seeding the in-memory reward store is **automatic** on module init (no opt-in),
so the demo page and the reward flow (which require an organization and an
active reward session) work immediately in memory mode.

## Tests

Five existing specs construct handlers directly with Sequelize model mocks and
will break on the new constructor signatures. They will be updated to the new
ports:

- `delete-transactions.handler.spec.ts` — mock `TransactionRepository`
- `delete-receipts.handler.spec.ts` — mock `ReceiptRepository`
- `get-reward-demo-data.handler.spec.ts` — mock `RewardQueryRepository`
- `create-reward-session.handler.spec.ts` — mock `UnitOfWork`
- `delete-reward-session.handler.spec.ts` — mock `UnitOfWork`

## Out of scope

- No change to domain aggregates/entities/value objects or the event/saga flow.
- No new HTTP endpoints; the controller contracts are unchanged.
- No persistence of transactions/receipts across restarts in memory mode (by
  definition of in-memory storage).
