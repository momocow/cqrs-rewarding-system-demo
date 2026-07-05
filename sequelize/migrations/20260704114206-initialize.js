'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const idColumn = {
      type: Sequelize.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.UUIDV4,
    };

    const timestamps = {
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    };

    await queryInterface.createTable('organizations', {
      id: idColumn,
      credit_limit: { type: Sequelize.INTEGER, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('reward_sessions', {
      id: idColumn,
      start_time: { type: Sequelize.DATE, allowNull: false },
      end_time: { type: Sequelize.DATE, allowNull: false },
      total_transaction_amount: { type: Sequelize.INTEGER, allowNull: false },
      total_receipt_count: { type: Sequelize.INTEGER, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('points', {
      id: idColumn,
      type: { type: Sequelize.ENUM('rewards', 'refund'), allowNull: false },
      source: {
        type: Sequelize.ENUM('transaction', 'receipt'),
        allowNull: false,
      },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      organization_id: { type: Sequelize.UUID, allowNull: false },
      reward_session_id: { type: Sequelize.UUID, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('transactions', {
      id: idColumn,
      organization_id: { type: Sequelize.UUID, allowNull: false },
      card_id: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.ENUM('spend', 'refund'), allowNull: false },
      merchant: { type: Sequelize.STRING, allowNull: false },
      cleared_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('receipts', {
      id: idColumn,
      organization_id: { type: Sequelize.UUID, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      ...timestamps,
    });

    // @see RewardSessionSequelize.findActiveOne
    await queryInterface.addIndex('reward_sessions', ['start_time', 'end_time']);

    // @see RewardSessionSequelizeRepositoryImpl.sumPointAmount
    await queryInterface.addIndex('points', ['reward_session_id', 'source']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('receipts');
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('points');
    await queryInterface.dropTable('reward_sessions');
    await queryInterface.dropTable('organizations');

    // Postgres keeps ENUM types after their table is dropped.
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_points_type";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_points_source";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_transactions_type";',
    );
  },
};
