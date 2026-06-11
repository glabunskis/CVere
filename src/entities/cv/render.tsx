import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { renderToBuffer } from '@react-pdf/renderer';
import type { User } from '@supabase/supabase-js';

import { Cv } from './pdf/Cv';
import type { ProfileContact } from './pdf/primitives';
import { DEFAULT_ACCENT } from './pdf/theme';
import { buildCvSnapshot } from './cv-snapshot';
import { getCvChildren } from './get-cv-children';

import 'server-only';

const STORAGE_BUCKET = 'pdf';
const CV_DIRNAME = 'cv';

type ProfileContactRow = {
  location: string | null;
  phone: string | null;
  contact_email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
};

export function buildProfileContact(profile: ProfileContactRow, fallbackEmail: string | null): ProfileContact {
  return {
    location: profile.location,
    phone: profile.phone,
    email: profile.contact_email ?? fallbackEmail,
    linkedinUrl: profile.linkedin_url,
    githubUrl: profile.github_url,
    websiteUrl: profile.website_url,
  };
}

export async function renderAndUploadCv({
  user,
  cvId,
}: {
  user: User;
  cvId: string;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: cv, error: cvError } = await supabase
    .from('cv')
    .select('*')
    .eq('id', cvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (cvError) throw new Error(cvError.message);
  if (!cv) throw new Error(`CV ${cvId} not found.`);

  const children = await getCvChildren(cv.id);
  const snapshot = buildCvSnapshot(cv, children);

  const userMetadata = (user.user_metadata ?? {}) as { full_name?: string };
  const identity = cv.full_name ?? userMetadata.full_name ?? user.email ?? '[MISSING] name';
  const contact = buildProfileContact(cv, user.email ?? null);

  const buffer = await renderToBuffer(
    <Cv
      template={cv.template}
      snapshot={snapshot}
      sections={{}}
      identityName={identity}
      contact={contact}
      accent={cv.accent_hex || DEFAULT_ACCENT}
      dateFormats={{
        education: cv.education_date_format,
        certification: cv.certification_date_format,
      }}
    />,
  );

  const path = `${user.id}/${CV_DIRNAME}/${cv.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from('cv')
    .update({ pdf_path: path })
    .eq('id', cv.id)
    .eq('user_id', user.id);
  if (updateError) throw new Error(updateError.message);

  return path;
}

export async function ensureCvPdfPath({
  user,
  cvId,
  existingPath,
}: {
  user: User;
  cvId: string;
  existingPath: string | null;
}): Promise<string> {
  if (existingPath) return existingPath;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('pdf_path')
    .eq('id', cvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`CV ${cvId} not found.`);
  if (data.pdf_path) return data.pdf_path;
  return renderAndUploadCv({ user, cvId });
}
