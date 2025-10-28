import { defineFunction } from '@aws-amplify/backend';

export const compareFaces = defineFunction({
  name: 'compare-faces',
  entry: './handler.ts',
});

