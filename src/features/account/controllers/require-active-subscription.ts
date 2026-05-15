import type { SubscriptionWithProduct } from '@/types/stripe';

import { getSubscription } from './get-subscription';

export class ProSubscriptionRequiredError extends Error {
  readonly httpStatus = 402;

  constructor(message = 'An active subscription is required to use this feature.') {
    super(message);
    this.name = 'ProSubscriptionRequiredError';
  }
}

export async function requireActiveSubscription(): Promise<SubscriptionWithProduct> {
  const subscription = await getSubscription();
  if (!subscription) {
    throw new ProSubscriptionRequiredError();
  }
  return subscription;
}
