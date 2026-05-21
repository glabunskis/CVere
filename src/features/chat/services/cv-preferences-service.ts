import type { CvPreferencesRow } from '@/features/previewer/controllers/get-cv-preferences';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { CvDateFormat } from '@/utils/format-date';
import type { User } from '@supabase/supabase-js';

import 'server-only';

export type CvPreferencesPatch = {
  template?: 'single-column' | 'two-column';
  accentHex?: string;
  educationDateFormat?: CvDateFormat;
  certificationDateFormat?: CvDateFormat;
};

type CvPreferencesUpdate = {
  template?: 'single-column' | 'two-column';
  accent_hex?: string;
  education_date_format?: CvDateFormat;
  certification_date_format?: CvDateFormat;
};

function toUpdate(patch: CvPreferencesPatch): CvPreferencesUpdate {
  const update: CvPreferencesUpdate = {};
  if (patch.template !== undefined) update.template = patch.template;
  if (patch.accentHex !== undefined) update.accent_hex = patch.accentHex;
  if (patch.educationDateFormat !== undefined) update.education_date_format = patch.educationDateFormat;
  if (patch.certificationDateFormat !== undefined) {
    update.certification_date_format = patch.certificationDateFormat;
  }
  return update;
}

export function isEmptyPatch(patch: CvPreferencesPatch): boolean {
  return (
    patch.template === undefined &&
    patch.accentHex === undefined &&
    patch.educationDateFormat === undefined &&
    patch.certificationDateFormat === undefined
  );
}

/**
 * Persist a partial update to the user's cv_preferences row. Persist only —
 * never triggers a PDF render. Callers (chat tools, safe-actions) are
 * responsible for rendering and revalidation when appropriate.
 */
export async function applyCvPreferencesPatch(
  user: User,
  patch: CvPreferencesPatch,
): Promise<CvPreferencesRow> {
  const supabase = await createSupabaseServerClient();
  const update = toUpdate(patch);
  const { data, error } = await supabase
    .from('cv_preferences')
    .upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update CV preferences');
  return data;
}
