'use strict';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

const SESSION_IDS = [
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
];

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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('reward_sessions', {
      id: { [Sequelize.Op.in]: SESSION_IDS },
    });
    await queryInterface.bulkDelete('organizations', {
      id: { [Sequelize.Op.in]: [ORG_A, ORG_B] },
    });
  },
};
