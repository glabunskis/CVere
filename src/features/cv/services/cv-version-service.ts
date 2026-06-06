import { getCvChildren } from '@/features/cv/controllers/get-cv-children';
import { type AiProfile, buildCvSnapshot } from '@/features/cv/cv-snapshot';
import { applyCvDiff, computeCvDiff, type CvDiff, isEmptyCvDiff } from '@/features/cv/services/cv-diff';
import { getCv } from '@/features/cv/services/cv-service';
import { renderAndUploadCv } from '@/features/previewer/render';
import { logger } from '@/libs/logger';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Json, TablesInsert } from '@/libs/supabase/types';
import type { User } from '@supabase/supabase-js';

import 'server-only';

const HISTORY_RETENTION = 100;

export type CvHistoryState = { canUndo: boolean; canRedo: boolean };

type SkillLevel = NonNullable<TablesInsert<'skill'>['level']>;
type LanguageProficiency = NonNullable<TablesInsert<'language'>['proficiency']>;

export async function loadCvSnapshot(user: User, cvId: string): Promise<AiProfile> {
  const cv = await getCv(cvId, user.id);
  const children = await getCvChildren(cv.id);
  return buildCvSnapshot(cv, children);
}

async function getHistorySeq(user: User, cvId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('history_seq')
    .eq('id', cvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`CV ${cvId} not found.`);
  return data.history_seq ?? 0;
}

export async function getCvHistoryState(user: User, cvId: string): Promise<CvHistoryState> {
  const supabase = await createSupabaseServerClient();
  const historySeq = await getHistorySeq(user, cvId);

  const { data: undoRow } = await supabase
    .from('cv_version')
    .select('id')
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .eq('seq', historySeq)
    .maybeSingle();
  const { data: redoRow } = await supabase
    .from('cv_version')
    .select('id')
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .eq('seq', historySeq + 1)
    .maybeSingle();

  return {
    canUndo: historySeq >= 1 && Boolean(undoRow),
    canRedo: Boolean(redoRow),
  };
}

export async function recordCvVersion({
  user,
  cvId,
  before,
  after,
  source,
  label,
}: {
  user: User;
  cvId: string;
  before: AiProfile;
  after: AiProfile;
  source: 'chat' | 'manual';
  label?: string | null;
}): Promise<void> {
  const diff = computeCvDiff(before, after);
  if (isEmptyCvDiff(diff)) return;

  const supabase = await createSupabaseServerClient();
  const historySeq = await getHistorySeq(user, cvId);
  const nextSeq = historySeq + 1;

  // Drop any invalidated redo branch (versions ahead of the current position).
  const { error: pruneRedoError } = await supabase
    .from('cv_version')
    .delete()
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .gt('seq', historySeq);
  if (pruneRedoError) throw new Error(pruneRedoError.message);

  const { error: insertError } = await supabase.from('cv_version').insert({
    cv_id: cvId,
    user_id: user.id,
    seq: nextSeq,
    diff: diff as unknown as Json,
    source,
    label: label ?? null,
  });
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from('cv')
    .update({ history_seq: nextSeq })
    .eq('id', cvId)
    .eq('user_id', user.id);
  if (updateError) throw new Error(updateError.message);

  await pruneHistory(user, cvId);
}

async function pruneHistory(user: User, cvId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv_version')
    .select('seq')
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .order('seq', { ascending: false })
    .range(HISTORY_RETENTION, HISTORY_RETENTION);
  if (error) throw new Error(error.message);
  const cutoff = data?.[0]?.seq;
  if (cutoff == null) return;

  const { error: deleteError } = await supabase
    .from('cv_version')
    .delete()
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .lte('seq', cutoff);
  if (deleteError) throw new Error(deleteError.message);
}

async function loadVersionDiff(user: User, cvId: string, seq: number): Promise<CvDiff | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv_version')
    .select('diff')
    .eq('cv_id', cvId)
    .eq('user_id', user.id)
    .eq('seq', seq)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.diff as unknown as CvDiff;
}

export async function restoreCvToSnapshot(
  user: User,
  cvId: string,
  target: AiProfile,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error: cvError } = await supabase
    .from('cv')
    .update({
      title: target.title,
      summary: target.summary ?? null,
      full_name: target.identity.fullName ?? null,
      location: target.identity.location ?? null,
      phone: target.identity.phone ?? null,
      contact_email: target.identity.contactEmail ?? null,
      linkedin_url: target.identity.linkedinUrl ?? null,
      github_url: target.identity.githubUrl ?? null,
      website_url: target.identity.websiteUrl ?? null,
      template: target.style.template as TablesInsert<'cv'>['template'],
      accent_hex: target.style.accentHex,
      education_date_format: target.style
        .educationDateFormat as TablesInsert<'cv'>['education_date_format'],
      certification_date_format: target.style
        .certificationDateFormat as TablesInsert<'cv'>['certification_date_format'],
    })
    .eq('id', cvId)
    .eq('user_id', user.id);
  if (cvError) throw new Error(cvError.message);

  await reconcileSection({
    table: 'experience',
    user,
    cvId,
    targetRows: target.experience.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      company: row.company,
      role: row.role,
      location: row.location ?? null,
      start_date: row.startDate ?? null,
      end_date: row.endDate ?? null,
      is_current: row.isCurrent ?? false,
      summary: row.summary ?? null,
      bullets: row.bullets as unknown as Json,
      stack: row.stack as unknown as Json,
    })),
  });

  await reconcileSection({
    table: 'project',
    user,
    cvId,
    targetRows: target.projects.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      name: row.name,
      description: row.description ?? null,
      link: row.link ?? null,
      bullets: row.bullets as unknown as Json,
      stack: row.stack as unknown as Json,
    })),
  });

  await reconcileSection({
    table: 'skill',
    user,
    cvId,
    targetRows: target.skills.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      name: row.name,
      category: row.category ?? null,
      level: (row.level ?? null) as SkillLevel | null,
    })),
  });

  await reconcileSection({
    table: 'education',
    user,
    cvId,
    targetRows: target.education.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      institution: row.institution,
      degree: row.degree ?? null,
      field: row.field ?? null,
      start_date: row.startDate ?? null,
      end_date: row.endDate ?? null,
      summary: row.summary ?? null,
    })),
  });

  await reconcileSection({
    table: 'certification',
    user,
    cvId,
    targetRows: target.certifications.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      name: row.name,
      issuer: row.issuer ?? null,
      issued_at: row.issuedAt ?? null,
      expires_at: row.expiresAt ?? null,
      link: row.link ?? null,
    })),
  });

  await reconcileSection({
    table: 'language',
    user,
    cvId,
    targetRows: target.languages.map((row, index) => ({
      id: row.id,
      user_id: user.id,
      cv_id: cvId,
      position: index,
      name: row.name,
      proficiency: (row.proficiency ?? null) as LanguageProficiency | null,
    })),
  });
}

type ReconcilableTable =
  | 'experience'
  | 'project'
  | 'skill'
  | 'education'
  | 'certification'
  | 'language';

async function reconcileSection({
  table,
  user,
  cvId,
  targetRows,
}: {
  table: ReconcilableTable;
  user: User;
  cvId: string;
  targetRows: ({ id: string } & Record<string, unknown>)[];
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // The typed client cannot resolve a union table name; the columns touched
  // here (id, user_id, cv_id, position) are shared across all six section
  // tables, so we pin to a single literal and cast the row payload.
  const t = table as 'experience';
  const rows = targetRows as unknown as TablesInsert<'experience'>[];

  const { data: existing, error: existingError } = await supabase
    .from(t)
    .select('id')
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (existingError) throw new Error(existingError.message);

  const targetIds = new Set(targetRows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !targetIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from(t)
      .delete()
      .eq('user_id', user.id)
      .eq('cv_id', cvId)
      .in('id', staleIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (rows.length > 0) {
    // Upsert preserves ids: inserts rows that vanished, updates the rest and
    // rewrites `position` to match the target ordering.
    const { error: upsertError } = await supabase.from(t).upsert(rows, { onConflict: 'id' });
    if (upsertError) throw new Error(upsertError.message);
  }
}

export async function undoCv(user: User, cvId: string): Promise<CvHistoryState> {
  const historySeq = await getHistorySeq(user, cvId);
  if (historySeq < 1) return getCvHistoryState(user, cvId);

  const diff = await loadVersionDiff(user, cvId, historySeq);
  if (!diff) return getCvHistoryState(user, cvId);

  const current = await loadCvSnapshot(user, cvId);
  const target = applyCvDiff(current, diff, 'inverse');
  await restoreCvToSnapshot(user, cvId, target);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv')
    .update({ history_seq: historySeq - 1 })
    .eq('id', cvId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await renderAndUploadCv({ user, cvId });
  logger.info({ userId: user.id, cvId, seq: historySeq }, 'cv-version undo');
  return getCvHistoryState(user, cvId);
}

export async function redoCv(user: User, cvId: string): Promise<CvHistoryState> {
  const historySeq = await getHistorySeq(user, cvId);
  const nextSeq = historySeq + 1;

  const diff = await loadVersionDiff(user, cvId, nextSeq);
  if (!diff) return getCvHistoryState(user, cvId);

  const current = await loadCvSnapshot(user, cvId);
  const target = applyCvDiff(current, diff, 'forward');
  await restoreCvToSnapshot(user, cvId, target);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv')
    .update({ history_seq: nextSeq })
    .eq('id', cvId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await renderAndUploadCv({ user, cvId });
  logger.info({ userId: user.id, cvId, seq: nextSeq }, 'cv-version redo');
  return getCvHistoryState(user, cvId);
}
