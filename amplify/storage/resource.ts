import { defineStorage } from '@aws-amplify/backend';

/**
 * Evidence photos. Each signed-in user can only read/write their own folder
 * (`evidence/<identityId>/...`). The compare function is granted read access
 * in backend.ts.
 */
export const storage = defineStorage({
  name: 'depositGuardEvidence',
  access: (allow) => ({
    'evidence/{entity_id}/*': [allow.entity('identity').to(['read', 'write', 'delete'])],
  }),
});
