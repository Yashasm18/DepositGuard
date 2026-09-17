import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { compareRoom } from './functions/compare-room/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  compareRoom,
});

const evidenceBucket = backend.storage.resources.bucket;
const compareLambda = backend.compareRoom.resources.lambda;

// Keep every version of every evidence photo, so an overwrite can never
// silently replace the original.
backend.storage.resources.cfnResources.cfnBucket.versioningConfiguration = {
  status: 'Enabled',
};

// The compare function reads the photos and calls Amazon Bedrock
// (Claude through the Messages API, Amazon Nova through Converse).
evidenceBucket.grantRead(compareLambda);
backend.compareRoom.addEnvironment('EVIDENCE_BUCKET', evidenceBucket.bucketName);
compareLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock-mantle:CreateInference', 'bedrock:InvokeModel'],
    resources: ['*'],
  }),
);
