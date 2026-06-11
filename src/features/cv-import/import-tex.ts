'use server';

import { revalidatePath } from 'next/cache';

import { getSelectedCv, renderAndUploadCv } from '@/entities/cv';
import { importTexSchema } from '@/features/cv-style';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import type { TablesUpdate } from '@/shared/api/supabase/types';
import { authActionClient } from '@/shared/lib/safe-action';

import { parseTexImport } from './tex-parser';

const CHILD_TABLES = ['experience', 'project', 'skill', 'education', 'certification', 'language'] as const;

export const importTex = authActionClient.inputSchema(importTexSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();
  const cv = await getSelectedCv(ctx.user.id);

  const parsed = parseTexImport(parsedInput.files);

  if (parsedInput.mode === 'replace') {
    for (const table of CHILD_TABLES) {
      const { error } = await supabase.from(table).delete().eq('cv_id', cv.id).eq('user_id', ctx.user.id);
      if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }

  // Profile summary + contact: replace if provided, leave existing values alone otherwise.
  const profileUpdate: TablesUpdate<'cv'> = {};
  if (parsed.summary && parsed.summary.length > 0) {
    profileUpdate.summary = parsed.summary;
  }
  if (parsed.contact) {
    if (parsed.contact.location) profileUpdate.location = parsed.contact.location;
    if (parsed.contact.phone) profileUpdate.phone = parsed.contact.phone;
    if (parsed.contact.contactEmail) profileUpdate.contact_email = parsed.contact.contactEmail;
    if (parsed.contact.linkedinUrl) profileUpdate.linkedin_url = parsed.contact.linkedinUrl;
    if (parsed.contact.githubUrl) profileUpdate.github_url = parsed.contact.githubUrl;
    if (parsed.contact.websiteUrl) profileUpdate.website_url = parsed.contact.websiteUrl;
  }
  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase
      .from('cv')
      .update(profileUpdate)
      .eq('id', cv.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
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
        cv_id: cv.id,
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
        cv_id: cv.id,
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
        cv_id: cv.id,
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
        cv_id: cv.id,
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
        cv_id: cv.id,
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
        cv_id: cv.id,
        position: row.position,
        name: row.name,
        proficiency: row.proficiency ?? null,
      })),
    );
    if (error) throw new Error(`Insert languages failed: ${error.message}`);
    counts.language = parsed.languages.length;
  }

  await renderAndUploadCv({ user: ctx.user, cvId: cv.id });

  revalidatePath('/dashboard');
  revalidatePath('/profile');

  return { ok: true as const, counts, warnings: parsed.warnings, summaryUpdated: !!parsed.summary };
});
