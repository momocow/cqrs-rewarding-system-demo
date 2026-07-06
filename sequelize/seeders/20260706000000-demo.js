'use strict';

const { randomUUID } = require('crypto');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

// Reward sessions are per-organization, so each org gets its own session row
// per window with its own totals — switching org on the demo page then moves
// both progress bars.
const ORGS = [
  { id: ORG_A, name: 'Acme Inc', creditLimit: 10000 },
  { id: ORG_B, name: 'Globex Corp', creditLimit: 50000 },
];

// Three calendar-month windows; per-org session ids (index 0 = oldest window).
const SESSION_IDS = {
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

// Per-org, per-window running totals so the bars diverge across orgs.
const SESSION_TOTALS = {
  [ORG_A]: [
    { total_transaction_amount: 2500, total_receipt_count: 4 },
    { total_transaction_amount: 5000, total_receipt_count: 10 },
    { total_transaction_amount: 6500, total_receipt_count: 12 },
  ],
  [ORG_B]: [
    { total_transaction_amount: 5000, total_receipt_count: 3 }, // ratio 0.10 -> 0 pts
    { total_transaction_amount: 12000, total_receipt_count: 8 }, // ratio 0.24 -> 300 pts
    { total_transaction_amount: 22000, total_receipt_count: 11 }, // ratio 0.44 -> 900 pts
  ],
};

// Mirror RewardSessionEntity's default policies (reward-session.entity.ts).
const TRANSACTION_REWARD_POLICIES = [
  { threshold: 0.2, points: 300 },
  { threshold: 0.4, points: 600 },
  { threshold: 0.6, points: 900 },
];
const RECEIPT_REWARD_POLICIES = [{ threshold: 10, points: 100 }];

// Award the sum of every policy whose threshold has been reached, matching the
// aggregate's applyTransactionReward / applyReceiptReward logic.
const earnedPoints = (policies, value) =>
  policies
    .filter((p) => p.threshold <= value)
    .reduce((total, p) => total + p.points, 0);

const allSessionIds = () => [...SESSION_IDS[ORG_A], ...SESSION_IDS[ORG_B]];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      'organizations',
      ORGS.map((o) => ({
        id: o.id,
        name: o.name,
        credit_limit: o.creditLimit,
        created_at: now,
        updated_at: now,
      })),
    );

    const month = (offset) => new Date(Date.UTC(2026, 4 + offset, 1)); // May, Jun, Jul 2026 (UTC)

    const sessionRows = [];
    const points = [];

    for (const org of ORGS) {
      SESSION_TOTALS[org.id].forEach((s, i) => {
        const sessionId = SESSION_IDS[org.id][i];
        sessionRows.push({
          id: sessionId,
          organization_id: org.id,
          start_time: month(i),
          end_time: month(i + 1),
          total_transaction_amount: s.total_transaction_amount,
          total_receipt_count: s.total_receipt_count,
          created_at: now,
          updated_at: now,
        });

        // Reward points earned in each session, so the demo read model reports
        // non-zero point subtotals instead of defaulting every session to 0.
        const bySource = {
          transaction: earnedPoints(
            TRANSACTION_REWARD_POLICIES,
            s.total_transaction_amount / org.creditLimit,
          ),
          receipt: earnedPoints(RECEIPT_REWARD_POLICIES, s.total_receipt_count),
        };
        for (const [source, amount] of Object.entries(bySource)) {
          if (amount <= 0) continue;
          points.push({
            id: randomUUID(),
            type: 'rewards',
            source,
            amount,
            organization_id: org.id,
            reward_session_id: sessionId,
            created_at: now,
            updated_at: now,
          });
        }
      });
    }

    await queryInterface.bulkInsert('reward_sessions', sessionRows);
    await queryInterface.bulkInsert('points', points);
  },

  async down(queryInterface, Sequelize) {
    const sessionIds = allSessionIds();
    await queryInterface.bulkDelete('points', {
      reward_session_id: { [Sequelize.Op.in]: sessionIds },
    });
    await queryInterface.bulkDelete('reward_sessions', {
      id: { [Sequelize.Op.in]: sessionIds },
    });
    await queryInterface.bulkDelete('organizations', {
      id: { [Sequelize.Op.in]: [ORG_A, ORG_B] },
    });
  },
};
