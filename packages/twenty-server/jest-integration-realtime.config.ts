import dotenv from 'dotenv';

import { NodeEnvironment } from 'src/engine/core-modules/twenty-config/interfaces/node-environment.interface';

// The shared integration harness (jest-integration.config.ts) boots the full
// AppModule in globalSetup and currently fails on this branch with a
// pre-existing TDZ in the workspace-query-runner import graph. The realtime
// gateway spec boots its own isolated Nest app (Redis + ws only, no DB), so
// it runs through this config without that globalSetup.
// Env-only config keeps the isolated app free of TypeORM/DB dependencies.
process.env.IS_CONFIG_VARIABLES_IN_DB_ENABLED = 'false';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true });
} else {
  dotenv.config({ path: '.env', override: true });
}

process.env.IS_CONFIG_VARIABLES_IN_DB_ENABLED = 'false';

const tsConfig = require('./tsconfig.json');

const jestConfig = {
  prettierPath: null,
  silent: false,
  errorOnDeprecated: true,
  maxConcurrency: 1,
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'realtime-gateway.integration-spec\\.ts$',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  testTimeout: 20000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  globals: {
    APP_PORT: 4000,
    NODE_ENV: NodeEnvironment.TEST,
  },
  transform: {
    '^.+\\.(t|j|mj)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true,
          },
          transform: {
            decoratorMetadata: true,
          },
          baseUrl: '.',
          paths: {
            'src/*': ['./src/*'],
            'test/*': ['./test/*'],
          },
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
};

export default jestConfig;
