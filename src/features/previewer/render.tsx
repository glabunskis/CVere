import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { MasterCv } from '@/pdf/render-master-cv';
import { DEFAULT_ACCENT } from '@/pdf/theme';
import { renderToBuffer } from '@react-pdf/renderer';
import type { User } from '@supabase/supabase-js';

import { getOrCreateCvPreferences } from './controllers/get-cv-preferences';

import 'server-only';

const STORAGE_BUCKET = 'pdf';
const MASTER_FILENAME = 'master.pdf';

export async function renderAndUploadMasterCv(user: User): Promise<string> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new Error('Profile not available');

  const [children, prefs] = await Promise.all([
    getProfileChildren(profile.id),
    getOrCreateCvPreferences(),
  ]);
  if (!prefs) throw new Error('CV preferences not available');

  const userMetadata = (user.user_metadata ?? {}) as { full_name?: string };
  const identity = userMetadata.full_name ?? user.email ?? '[MISSING] name';
  const contactLine = user.email ?? undefined;

  const buffer = await renderToBuffer(
    <MasterCv
      summary={profile.summary}
      profileChildren={children}
      template={prefs.template}
      accent={prefs.accent_hex || DEFAULT_ACCENT}
      identityName={identity}
      contactLine={contactLine}
    />,
  );

  const supabase = await createSupabaseServerClient();
  const path = `${user.id}/${MASTER_FILENAME}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from('cv_preferences')
    .update({ master_pdf_path: path })
    .eq('user_id', user.id);
  if (updateError) throw new Error(updateError.message);

  return path;
}

export async function ensureMasterPdfPath(user: User, existingPath: string | null): Promise<string> {
  if (existingPath) return existingPath;
  return renderAndUploadMasterCv(user);
}
