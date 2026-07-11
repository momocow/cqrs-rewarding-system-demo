# Reward Demo

## Architecture Overview

### Bounded contexts

| Context        | Responsibility                                                   |
| -------------- | ---------------------------------------------------------------- |
| `transaction/` | Card transactions (spend / refund).                              |
| `receipt/`     | Uploaded receipts                                                |
| `reward/`      | Reward sessions, reward policies, and accrued points (the core). |

### Layering (per context)

- **`domain/`** — aggregates, entities, value objects, domain events, and the
  abstract repository.
- **`usecase/`** — CQRS command/query handlers, sagas, and event emitters.
- **`infra/`** — Sequelize models and concrete repository implementations.
- **`*.controller.ts`** — HTTP adapters.

### Reward flow (event-driven)

```
POST /transactions ─▶ TransactionCreatedEvent
                          │  (saga)
                          ▼
                   RecognizeTransactionCommand ─▶ TransactionRecognizedEvent
                          │  (saga)
                          ▼
                   ApplyTransactionRewardCommand ─▶ PointRewardedEvent
                                                        │
                                                        ▼
                                            SSE: GET /reward-sessions/events
```

Receipts follow the mirror-image path (`ReceiptCreatedEvent` →
`RecognizeReceiptCommand` → `ApplyReceiptRewardCommand`).

## Project setup

```bash
$ npm install
```

Requires a PostgreSQL database. Locally the app connects to
`postgres://postgres:postgres@localhost:5433/reward_demo`; in production it uses
`DATABASE_URL` over SSL. Apply schema and seed data with Sequelize:

```bash
$ npx sequelize-cli db:migrate
$ npx sequelize-cli db:seed:all
```

## Run

```bash
$ npm run start        # development
$ npm run start:dev    # watch mode
$ npm run start:prod   # production (node dist/main)
```

The static demo page is served at `/index.html`.

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

## Test

```bash
$ npm run test         # unit tests
$ npm run test:e2e     # e2e tests
$ npm run test:cov     # coverage
```

## Q&A

1. Why does `RecognizeTransactionCommand` and `RecognizeReceiptCommand` ever need?

> Because as a minimum requirement in rewarding domain, it needs total amount of corresponding data to calculate rewarding (in points).
>
> If dedupe is needed for the 2 commands, the domain models should also track respective IDs.

2. Why are `RecognizeTransactionCommand` and `ApplyTransactionRewardCommand` separate commands? (Same as `RecognizeReceiptCommand` and `ApplyReceiptRewardCommand`)

> Because a recognition and a rewarding is not 1-1 relationship.
> They can actually be N-1 relationship,
> which indicates that we can easily perform throttling between a recognition and a rewarding
> to mitigate bottleneck.
