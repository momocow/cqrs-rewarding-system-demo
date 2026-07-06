'use strict';

// Old reward sessions were global (one row per window, aggregating every org).
// The seeded demo points for those rows were attributed to ORG_A, so existing
// rows are backfilled to ORG_A before the column is made non-nullable.
const DEFAULT_ORG_ID = '11111111-1111-1111-1111-111111111111';

/**
 * Reward sessions become per-organization: each organization gets its own
 * session row per time window, so its running totals and earned points stay
 * scoped to that organization instead of being aggregated globally.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. add nullable so existing rows are accepted
    await queryInterface.addColumn('reward_sessions', 'organization_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // 2. backfill any pre-existing (global) session rows
    await queryInterface.sequelize.query(
      'UPDATE reward_sessions SET organization_id = :orgId WHERE organization_id IS NULL',
      { replacements: { orgId: DEFAULT_ORG_ID } },
    );

    // 3. enforce non-null now that every row has a value
    await queryInterface.changeColumn('reward_sessions', 'organization_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // active-session lookup is now scoped by organization
    // @see RewardSessionSequelize.findActiveOne
    await queryInterface.addIndex('reward_sessions', [
      'organization_id',
      'start_time',
      'end_time',
    ]);
    await queryInterface.removeIndex('reward_sessions', [
      'start_time',
      'end_time',
    ]);
  },

  async down(queryInterface) {
    await queryInterface.addIndex('reward_sessions', ['start_time', 'end_time']);
    await queryInterface.removeIndex('reward_sessions', [
      'organization_id',
      'start_time',
      'end_time',
    ]);
    await queryInterface.removeColumn('reward_sessions', 'organization_id');
  },
};
