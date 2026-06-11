import { createSafeActionClient } from 'next-safe-action';

// eslint-disable-next-line no-restricted-imports -- accepted FSD deviation: shared→entities; auth middleware belongs in a dedicated infra layer but extraction is deferred
import { getSession } from '@/entities/user/get-session';

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error('Action error:', error.message);
    return error.message;
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await getSession();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return next({ ctx: { user } });
});
