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
  const supabase = await createSupabaseServerClient();

  if (preferences?.selected_cv_id) {
    const { data, error } = await supabase
      .from('cv')
      .select('id')
      .eq('id', preferences.selected_cv_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) return { cvId: data.id };
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('cv')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (fallbackError) throw new Error(fallbackError.message);
  if (!fallback) throw new Error('Default CV not found.');
  return { cvId: fallback.id };
}
