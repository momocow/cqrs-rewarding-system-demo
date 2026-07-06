'use strict';

/**
 * Reward sessions become per-organization: each organization gets its own
 * session row per time window, so its running totals and earned points stay
 * scoped to that organization instead of being aggregated globally.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reward_sessions', 'organization_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // Active-session lookup is now scoped by organization.
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

  async down(queryInterface, Sequelize) {
    await queryInterface.addIndex('reward_sessions', ['start_time', 'end_time']);
    await queryInterface.removeIndex('reward_sessions', [
      'organization_id',
      'start_time',
      'end_time',
    ]);
    await queryInterface.removeColumn('reward_sessions', 'organization_id');
  },
};
