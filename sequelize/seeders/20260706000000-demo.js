'use strict';

const { randomUUID } = require('crypto');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

// Points are seeded for ORG_A (the default org selected by the demo page), so
// the earned-point subtotals line up with the credit-limit ratio bars.
const ORG_A_CREDIT_LIMIT = 10000;

const SESSION_IDS = [
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
];

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

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('organizations', [
      {
        id: ORG_A,
        name: 'Acme Inc',
        credit_limit: 10000,
        created_at: now,
        updated_at: now,
      },
      {
        id: ORG_B,
        name: 'Globex Corp',
        credit_limit: 50000,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Three calendar-month sessions with varied totals so the bars differ.
    const month = (offset) => new Date(Date.UTC(2026, 4 + offset, 1)); // May, Jun, Jul 2026 (UTC)
    const sessions = [
      { total_transaction_amount: 2500, total_receipt_count: 4 },
      { total_transaction_amount: 5000, total_receipt_count: 10 },
      { total_transaction_amount: 6500, total_receipt_count: 12 },
    ];

    await queryInterface.bulkInsert(
      'reward_sessions',
      sessions.map((s, i) => ({
        id: SESSION_IDS[i],
        start_time: month(i),
        end_time: month(i + 1),
        total_transaction_amount: s.total_transaction_amount,
        total_receipt_count: s.total_receipt_count,
        created_at: now,
        updated_at: now,
      })),
    );

    // Reward points earned in each session, so the demo read model reports
    // non-zero point subtotals instead of defaulting every session to 0.
    const points = [];
    sessions.forEach((s, i) => {
      const bySource = {
        transaction: earnedPoints(
          TRANSACTION_REWARD_POLICIES,
          s.total_transaction_amount / ORG_A_CREDIT_LIMIT,
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
          organization_id: ORG_A,
          reward_session_id: SESSION_IDS[i],
          created_at: now,
          updated_at: now,
        });
      }
    });

    await queryInterface.bulkInsert('points', points);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('points', {
      reward_session_id: { [Sequelize.Op.in]: SESSION_IDS },
    });
    await queryInterface.bulkDelete('reward_sessions', {
      id: { [Sequelize.Op.in]: SESSION_IDS },
    });
    await queryInterface.bulkDelete('organizations', {
      id: { [Sequelize.Op.in]: [ORG_A, ORG_B] },
    });
  },
};
