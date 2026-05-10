'use server';

import { revalidatePath } from 'next/cache';

import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { parseTexImport } from '../import/tex-parser';
import { renderAndUploadMasterCv } from '../render';
import { importTexSchema } from '../schemas';

const CHILD_TABLES = ['experience', 'project', 'skill', 'education', 'certification', 'language'] as const;

export const importTex = authActionClient.inputSchema(importTexSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();
  const profile = await getOrCreateProfile();
  if (!profile) throw new Error('Profile not available');

  const parsed = parseTexImport(parsedInput.files);

  if (parsedInput.mode === 'replace') {
    for (const table of CHILD_TABLES) {
      const { error } = await supabase.from(table).delete().eq('profile_id', profile.id).eq('user_id', ctx.user.id);
      if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }

  // Profile summary: replace if provided, leave alone otherwise.
  if (parsed.summary && parsed.summary.length > 0) {
    const { error } = await supabase
      .from('profile')
      .update({ summary: parsed.summary })
      .eq('id', profile.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(`Failed to update summary: ${error.message}`);
  }

  const counts = {
    experience: 0,
    project: 0,
    skill: 0,
    education: 0,
    certification: 0,
    language: 0,
  };

  if (parsed.experience.length) {
    const { error } = await supabase.from('experience').insert(
      parsed.experience.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        company: row.company,
        role: row.role,
        location: row.location ?? null,
        start_date: row.startDate ?? null,
        end_date: row.endDate ?? null,
        is_current: row.isCurrent ?? false,
        summary: row.summary ?? null,
        bullets: row.bullets,
        stack: row.stack,
      })),
    );
    if (error) throw new Error(`Insert experience failed: ${error.message}`);
    counts.experience = parsed.experience.length;
  }

  if (parsed.projects.length) {
    const { error } = await supabase.from('project').insert(
      parsed.projects.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        name: row.name,
        description: row.description ?? null,
        link: row.link || null,
        bullets: row.bullets,
        stack: row.stack,
      })),
    );
    if (error) throw new Error(`Insert projects failed: ${error.message}`);
    counts.project = parsed.projects.length;
  }

  if (parsed.skills.length) {
    const { error } = await supabase.from('skill').insert(
      parsed.skills.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        name: row.name,
        category: row.category ?? null,
        level: row.level ?? null,
      })),
    );
    if (error) throw new Error(`Insert skills failed: ${error.message}`);
    counts.skill = parsed.skills.length;
  }

  if (parsed.education.length) {
    const { error } = await supabase.from('education').insert(
      parsed.education.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        institution: row.institution,
        degree: row.degree ?? null,
        field: row.field ?? null,
        start_date: row.startDate ?? null,
        end_date: row.endDate ?? null,
        summary: row.summary ?? null,
      })),
    );
    if (error) throw new Error(`Insert education failed: ${error.message}`);
    counts.education = parsed.education.length;
  }

  if (parsed.certifications.length) {
    const { error } = await supabase.from('certification').insert(
      parsed.certifications.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        name: row.name,
        issuer: row.issuer ?? null,
        issued_at: row.issuedAt ?? null,
        expires_at: row.expiresAt ?? null,
        link: row.link || null,
      })),
    );
    if (error) throw new Error(`Insert certifications failed: ${error.message}`);
    counts.certification = parsed.certifications.length;
  }

  if (parsed.languages.length) {
    const { error } = await supabase.from('language').insert(
      parsed.languages.map((row) => ({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: row.position,
        name: row.name,
        proficiency: row.proficiency ?? null,
      })),
    );
    if (error) throw new Error(`Insert languages failed: ${error.message}`);
    counts.language = parsed.languages.length;
  }

  // Re-render the master CV after import.
  await renderAndUploadMasterCv(ctx.user);

  revalidatePath('/dashboard');
  revalidatePath('/profile');

  return { ok: true as const, counts, warnings: parsed.warnings, summaryUpdated: !!parsed.summary };
});
