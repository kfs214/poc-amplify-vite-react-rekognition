import { defineFunction } from '@aws-amplify/backend';

export const getLivenessSessionResults = defineFunction({
  name: 'get-liveness-session-results',
  entry: './handler.ts',
});

