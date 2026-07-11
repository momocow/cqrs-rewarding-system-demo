export const STORAGE_DRIVER_ENV = 'STORAGE_DRIVER';

/** True when the app should use the in-memory persistence backend. */
export const isMemory = (env: NodeJS.ProcessEnv): boolean =>
  env[STORAGE_DRIVER_ENV] === 'memory';

/** True when the app should use the Sequelize (database) backend (default). */
export const isSequelize = (env: NodeJS.ProcessEnv): boolean => !isMemory(env);
