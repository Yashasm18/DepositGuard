import { defineAuth } from '@aws-amplify/backend';

/**
 * Tenants sign in with email. Cognito handles sign-up, verification and sessions.
 * @see https://docs.amplify.aws/react/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
