import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import type { PreviewTarget } from '../preview-target';

import type { CvPreferencesRow } from './get-cv-preferences';

import 'server-only';

export async function resolveInitialPreviewTarget({
  userId,
  preferences,
}: {
  userId: string;
  preferences: CvPreferencesRow | null;
}): Promise<PreviewTarget> {
  if (
    preferences?.last_previewed_kind === 'tailored_cv' &&
    preferences.last_previewed_ref_id
  ) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tailored_cv')
      .select('id')
      .eq('id', preferences.last_previewed_ref_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      return { kind: 'tailored_cv', refId: data.id };
    }
  }
  return { kind: 'master' };
}
