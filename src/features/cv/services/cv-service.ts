import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/libs/supabase/types';

import 'server-only';

type CvRow = Tables<'cv'>;

type CvTableColumns = {
  experience: Pick<
    TablesInsert<'experience'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'company'
    | 'role'
    | 'location'
    | 'start_date'
    | 'end_date'
    | 'is_current'
    | 'summary'
    | 'bullets'
    | 'stack'
  >;
  project: Pick<
    TablesInsert<'project'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'name'
    | 'description'
    | 'link'
    | 'bullets'
    | 'stack'
  >;
  skill: Pick<TablesInsert<'skill'>, 'user_id' | 'cv_id' | 'position' | 'name' | 'category' | 'level'>;
  education: Pick<
    TablesInsert<'education'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'institution'
    | 'degree'
    | 'field'
    | 'start_date'
    | 'end_date'
    | 'summary'
  >;
  certification: Pick<
    TablesInsert<'certification'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'name'
    | 'issuer'
    | 'issued_at'
    | 'expires_at'
    | 'link'
  >;
  language: Pick<TablesInsert<'language'>, 'user_id' | 'cv_id' | 'position' | 'name' | 'proficiency'>;
};

async function getOwnedCv(userId: string, cvId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('id', cvId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`CV ${cvId} not found.`);
  return data;
}

async function getDefaultCv(userId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Default CV not found.');
  return data;
}

async function cloneSectionRows({
  userId,
  sourceCvId,
  targetCvId,
}: {
  userId: string;
  sourceCvId: string;
  targetCvId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: experienceRows, error: experienceError } = await supabase
    .from('experience')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (experienceError) throw new Error(experienceError.message);
  if (experienceRows && experienceRows.length > 0) {
    const insertable = experienceRows.map<CvTableColumns['experience']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      company: row.company,
      role: row.role,
      location: row.location,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: row.is_current,
      summary: row.summary,
      bullets: row.bullets,
      stack: row.stack,
    }));
    const { error } = await supabase.from('experience').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: projectRows, error: projectError } = await supabase
    .from('project')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (projectError) throw new Error(projectError.message);
  if (projectRows && projectRows.length > 0) {
    const insertable = projectRows.map<CvTableColumns['project']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      description: row.description,
      link: row.link,
      bullets: row.bullets,
      stack: row.stack,
    }));
    const { error } = await supabase.from('project').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: skillRows, error: skillError } = await supabase
    .from('skill')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (skillError) throw new Error(skillError.message);
  if (skillRows && skillRows.length > 0) {
    const insertable = skillRows.map<CvTableColumns['skill']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      category: row.category,
      level: row.level,
    }));
    const { error } = await supabase.from('skill').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: educationRows, error: educationError } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (educationError) throw new Error(educationError.message);
  if (educationRows && educationRows.length > 0) {
    const insertable = educationRows.map<CvTableColumns['education']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      institution: row.institution,
      degree: row.degree,
      field: row.field,
      start_date: row.start_date,
      end_date: row.end_date,
      summary: row.summary,
    }));
    const { error } = await supabase.from('education').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: certificationRows, error: certificationError } = await supabase
    .from('certification')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (certificationError) throw new Error(certificationError.message);
  if (certificationRows && certificationRows.length > 0) {
    const insertable = certificationRows.map<CvTableColumns['certification']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      issuer: row.issuer,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      link: row.link,
    }));
    const { error } = await supabase.from('certification').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: languageRows, error: languageError } = await supabase
    .from('language')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (languageError) throw new Error(languageError.message);
  if (languageRows && languageRows.length > 0) {
    const insertable = languageRows.map<CvTableColumns['language']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      proficiency: row.proficiency,
    }));
    const { error } = await supabase.from('language').insert(insertable);
    if (error) throw new Error(error.message);
  }
}

export async function listCvs(userId: string): Promise<CvRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCv(cvId: string, userId: string): Promise<CvRow> {
  return getOwnedCv(userId, cvId);
}

export async function getSelectedCv(userId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data: prefs, error: prefError } = await supabase
    .from('cv_preferences')
    .select('selected_cv_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefError) throw new Error(prefError.message);

  if (prefs?.selected_cv_id) {
    const candidate = await getOwnedCv(userId, prefs.selected_cv_id).catch(() => null);
    if (candidate) return candidate;
  }

  const fallback = await getDefaultCv(userId);
  await supabase
    .from('cv_preferences')
    .upsert({ user_id: userId, selected_cv_id: fallback.id }, { onConflict: 'user_id' });
  return fallback;
}

export async function setSelectedCv(userId: string, cvId: string): Promise<void> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv_preferences')
    .upsert({ user_id: userId, selected_cv_id: cvId }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function createCv({
  userId,
  title,
  sourceCvId,
  sourceVacancyId,
}: {
  userId: string;
  title: string;
  sourceCvId?: string | null;
  sourceVacancyId?: string | null;
}): Promise<CvRow> {
  const source =
    sourceCvId != null
      ? await getOwnedCv(userId, sourceCvId)
      : await getSelectedCv(userId).catch(() => getDefaultCv(userId));

  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'cv'> = {
    user_id: userId,
    title: title.trim(),
    is_default: false,
    source_cv_id: source?.id ?? null,
    source_vacancy_id: sourceVacancyId ?? null,
    summary: source?.summary ?? null,
    full_name: source?.full_name ?? null,
    location: source?.location ?? null,
    phone: source?.phone ?? null,
    contact_email: source?.contact_email ?? null,
    linkedin_url: source?.linkedin_url ?? null,
    github_url: source?.github_url ?? null,
    website_url: source?.website_url ?? null,
    links: source?.links ?? [],
    template: source?.template ?? 'single-column',
    accent_hex: source?.accent_hex ?? '#000000',
    education_date_format: source?.education_date_format ?? 'mon_yyyy',
    certification_date_format: source?.certification_date_format ?? 'mon_yyyy',
    pdf_path: null,
  };
  const { data, error } = await supabase.from('cv').insert(insertable).select('*').single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create CV');

  if (source) {
    await cloneSectionRows({ userId, sourceCvId: source.id, targetCvId: data.id });
  }

  return data;
}

export async function duplicateCv(userId: string, cvId: string): Promise<CvRow> {
  const row = await getOwnedCv(userId, cvId);
  return createCv({
    userId,
    sourceCvId: row.id,
    title: `${row.title} Copy`,
    sourceVacancyId: row.source_vacancy_id,
  });
}

export async function renameCv(userId: string, cvId: string, title: string): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ title: title.trim() })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to rename CV');
  return data;
}

export async function deleteCv(userId: string, cvId: string): Promise<void> {
  const cv = await getOwnedCv(userId, cvId);
  if (cv.is_default) {
    throw new Error('Default CV cannot be deleted.');
  }

  const supabase = await createSupabaseServerClient();
  if (cv.pdf_path) {
    await supabase.storage.from('pdf').remove([cv.pdf_path]);
  }

  const { error } = await supabase.from('cv').delete().eq('id', cvId).eq('user_id', userId);
  if (error) throw new Error(error.message);

  const { data: prefs } = await supabase
    .from('cv_preferences')
    .select('selected_cv_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefs?.selected_cv_id === cvId) {
    const fallback = await getDefaultCv(userId);
    await setSelectedCv(userId, fallback.id);
  }
}

export async function rewriteSummary({
  userId,
  cvId,
  summary,
}: {
  userId: string;
  cvId: string;
  summary: string | null;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ summary })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update summary');
  return data;
}

export async function updateIdentity({
  userId,
  cvId,
  patch,
}: {
  userId: string;
  cvId: string;
  patch: Pick<TablesUpdate<'cv'>, 'full_name' | 'location'>;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update CV identity');
  return data;
}

export async function updateContact({
  userId,
  cvId,
  patch,
}: {
  userId: string;
  cvId: string;
  patch: Pick<
    TablesUpdate<'cv'>,
    'phone' | 'contact_email' | 'linkedin_url' | 'github_url' | 'website_url'
  >;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update CV contact');
  return data;
}

export async function setTemplate({
  userId,
  cvId,
  template,
}: {
  userId: string;
  cvId: string;
  template: Database['public']['Enums']['cv_template'];
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ template })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update template');
  return data;
}

export async function setAccentHex({
  userId,
  cvId,
  accentHex,
}: {
  userId: string;
  cvId: string;
  accentHex: string;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ accent_hex: accentHex })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update accent');
  return data;
}

export async function setDateFormat({
  userId,
  cvId,
  section,
  format,
}: {
  userId: string;
  cvId: string;
  section: 'education' | 'certification';
  format: Database['public']['Enums']['cv_date_format'];
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const patch: TablesUpdate<'cv'> =
    section === 'education'
      ? { education_date_format: format }
      : { certification_date_format: format };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update date format');
  return data;
}

export async function markPdfPath({
  userId,
  cvId,
  path,
}: {
  userId: string;
  cvId: string;
  path: string | null;
}): Promise<void> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv')
    .update({ pdf_path: path })
    .eq('id', cvId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
