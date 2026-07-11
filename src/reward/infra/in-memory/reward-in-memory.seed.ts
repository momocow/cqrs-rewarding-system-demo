import { randomUUID } from 'crypto';

import { PointType, RewardSource } from '../../types';
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
  policies
    .filter((p) => p.threshold <= value)
    .reduce((t, p) => t + p.points, 0);

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
