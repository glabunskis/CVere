import { applySectionsToSnapshot, readTailoredSnapshot, tailoredSectionsSchema } from '@/features/chat/tailored-snapshot';
import type { PreviewTarget } from '@/features/previewer/preview-target';
import { getOrCreateProfile, type ProfileRow } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { Cv } from '@/pdf/Cv';
import type { ProfileContact } from '@/pdf/primitives';
import { MasterCv } from '@/pdf/render-master-cv';
import { DEFAULT_ACCENT } from '@/pdf/theme';
import { renderToBuffer } from '@react-pdf/renderer';
import type { User } from '@supabase/supabase-js';

import { getOrCreateCvPreferences } from './controllers/get-cv-preferences';

import 'server-only';

const STORAGE_BUCKET = 'pdf';
const MASTER_FILENAME = 'master.pdf';
const TAILORED_DIRNAME = 'tailored';

export function buildProfileContact(profile: ProfileRow, fallbackEmail: string | null): ProfileContact {
  return {
    location: profile.location,
    phone: profile.phone,
    email: profile.contact_email ?? fallbackEmail,
    linkedinUrl: profile.linkedin_url,
    githubUrl: profile.github_url,
    websiteUrl: profile.website_url,
  };
}

export async function renderAndUploadMasterCv(user: User): Promise<string> {
  return renderAndUploadCv({ user, target: { kind: 'master' } });
}

export async function renderAndUploadTailoredCv(user: User, tailoredCvId: string): Promise<string> {
  return renderAndUploadCv({ user, target: { kind: 'tailored_cv', refId: tailoredCvId } });
}

export async function renderAndUploadCv({
  user,
  target,
}: {
  user: User;
  target: PreviewTarget;
}): Promise<string> {
  if (target.kind === 'master') {
    return renderAndUploadMaster(user);
  }
  return renderAndUploadTailored(user, target.refId);
}

async function renderAndUploadMaster(user: User): Promise<string> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new Error('Profile not available');

  const [children, prefs] = await Promise.all([
    getProfileChildren(profile.id),
    getOrCreateCvPreferences(),
  ]);
  if (!prefs) throw new Error('CV preferences not available');

  const userMetadata = (user.user_metadata ?? {}) as { full_name?: string };
  const identity = profile.full_name ?? userMetadata.full_name ?? user.email ?? '[MISSING] name';
  const contact = buildProfileContact(profile, user.email ?? null);

  const buffer = await renderToBuffer(
    <MasterCv
      summary={profile.summary}
      profileChildren={children}
      template={prefs.template}
      accent={prefs.accent_hex || DEFAULT_ACCENT}
      identityName={identity}
      contact={contact}
      dateFormats={{
        education: prefs.education_date_format,
        certification: prefs.certification_date_format,
      }}
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
  return renderAndUploadMaster(user);
}

export async function ensureTailoredPdfPath(
  user: User,
  tailoredCvId: string,
  existingPath: string | null,
): Promise<string> {
  if (existingPath) return existingPath;
  return renderAndUploadTailored(user, tailoredCvId);
}

export async function ensureCvPdfPath({
  user,
  target,
  existingMasterPath,
}: {
  user: User;
  target: PreviewTarget;
  existingMasterPath: string | null;
}): Promise<string> {
  if (target.kind === 'master') {
    return ensureMasterPdfPath(user, existingMasterPath);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .select('pdf_path')
    .eq('id', target.refId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Tailored CV ${target.refId} not found.`);
  return ensureTailoredPdfPath(user, target.refId, data.pdf_path);
}

async function renderAndUploadTailored(user: User, tailoredCvId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: tailored, error: tailoredError } = await supabase
    .from('tailored_cv')
    .select('*')
    .eq('id', tailoredCvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (tailoredError) throw new Error(tailoredError.message);
  if (!tailored) throw new Error(`Tailored CV ${tailoredCvId} not found.`);

  const prefs = await getOrCreateCvPreferences();
  if (!prefs) throw new Error('CV preferences not available');

  const snapshot = readTailoredSnapshot(tailored.source_profile_snapshot);
  const sections = tailoredSectionsSchema.safeParse(tailored.sections ?? {});
  if (!sections.success) throw new Error('Tailored CV sections are invalid.');

  const mergedProfile = applySectionsToSnapshot({
    snapshot,
    sections: sections.data,
    summary: tailored.summary,
  });

  const buffer = await renderToBuffer(
    <Cv
      template={tailored.template ?? prefs.template}
      snapshot={mergedProfile}
      sections={{}}
      identityName={snapshot.identity.fullName}
      contact={snapshot.identity.contact}
      accent={tailored.accent_hex || prefs.accent_hex || DEFAULT_ACCENT}
      dateFormats={{
        education: prefs.education_date_format,
        certification: prefs.certification_date_format,
      }}
    />,
  );

  const path = `${user.id}/${TAILORED_DIRNAME}/${tailoredCvId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from('tailored_cv')
    .update({ pdf_path: path })
    .eq('id', tailoredCvId)
    .eq('user_id', user.id);
  if (updateError) throw new Error(updateError.message);

  return path;
}
