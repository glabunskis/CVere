import Stripe from 'stripe';

import { STRIPE_APP_NAME } from '@/config';
import { getEnvVar } from '@/utils/get-env-var';

let cached: Stripe | null = null;

// Lazy proxy: defer reading STRIPE_SECRET_KEY until the first method call so the
// app can build and run without Stripe credentials while billing is dormant.
export const stripeAdmin = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!cached) {
      cached = new Stripe(getEnvVar(process.env.STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY'), {
        apiVersion: '2026-03-25.dahlia',
        appInfo: {
          name: STRIPE_APP_NAME,
          version: '0.1.0',
        },
      });
    }
    return Reflect.get(cached as object, prop, receiver);
  },
});
