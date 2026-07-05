'use strict';

// sequelize-cli picks the block matching NODE_ENV (defaults to "development").
// On Heroku, NODE_ENV=production and DATABASE_URL is provided by the
// heroku-postgresql addon; the release phase runs migrations against it.
module.exports = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'reward_demo',
    host: '127.0.0.1',
    port: 5433,
    dialect: 'postgres',
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
