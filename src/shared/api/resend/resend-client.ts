import { Resend } from 'resend';

import { getEnvVar } from '@/shared/lib/get-env-var';

let cached: Resend | null = null;

// Lazy proxy: defer reading RESEND_API_KEY until the first method call so the
// app can build and run without Resend credentials while transactional email is dormant.
export const resendClient = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    if (!cached) {
      cached = new Resend(getEnvVar(process.env.RESEND_API_KEY, 'RESEND_API_KEY'));
    }
    return Reflect.get(cached as object, prop, receiver);
  },
});
