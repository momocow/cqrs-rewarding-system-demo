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

## Test

```bash
$ npm run test         # unit tests
$ npm run test:e2e     # e2e tests
$ npm run test:cov     # coverage
```
