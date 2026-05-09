import { createSafeActionClient } from 'next-safe-action';

import { getSession } from '@/features/account/controllers/get-session';

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
