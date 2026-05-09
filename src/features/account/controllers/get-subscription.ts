import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { SubscriptionWithProduct } from '@/types/stripe';

export async function getSubscription(): Promise<SubscriptionWithProduct | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  return (data as unknown as SubscriptionWithProduct) ?? null;
}
