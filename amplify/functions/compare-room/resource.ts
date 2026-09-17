import { defineFunction } from '@aws-amplify/backend';

export const compareRoom = defineFunction({
  name: 'compare-room',
  entry: './handler.ts',
  // Vision comparison of several photos can take a while.
  timeoutSeconds: 300,
  memoryMB: 1024,
  // Keep the function in the data stack to avoid a circular dependency
  // between the data and storage stacks.
  resourceGroupName: 'data',
  environment: {
    // Claude first; Amazon Nova as the fallback for accounts without Claude access.
    BEDROCK_MODEL_IDS: [
      'anthropic.claude-opus-5',
      'anthropic.claude-sonnet-5',
      'us.amazon.nova-2-lite-v1:0',
      'us.amazon.nova-pro-v1:0',
      'us.amazon.nova-lite-v1:0',
    ].join(','),
  },
});
