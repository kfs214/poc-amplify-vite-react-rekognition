import { defineFunction } from '@aws-amplify/backend';

export const createLivenessSession = defineFunction({
  name: 'create-liveness-session',
  entry: './handler.ts',
});

