'use strict';

const NAMES = {
  '11111111-1111-1111-1111-111111111111': 'Acme Inc',
  '22222222-2222-2222-2222-222222222222': 'Globex Corp',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('organizations', 'name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // backfill the seeded organizations so existing rows show a name
    for (const [id, name] of Object.entries(NAMES)) {
      await queryInterface.bulkUpdate('organizations', { name }, { id });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('organizations', 'name');
  },
};
