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
    BEDROCK_MODEL_IDS:
      'anthropic.claude-opus-5,anthropic.claude-sonnet-5,anthropic.claude-opus-4-8,anthropic.claude-haiku-4-5',
  },
});
