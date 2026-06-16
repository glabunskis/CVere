'use server';

import { revalidatePath } from 'next/cache';

import { getSelectedCv, renderAndUploadCv, updateSummary } from '@/entities/cv';
import { loadCvSnapshot, recordCvVersion } from '@/features/cv-history';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { authActionClient } from '@/shared/lib/safe-action';

import { deleteProfileChildSchema, profileSectionInputSchema } from '../schemas';

export const updateProfileSection = authActionClient
  .inputSchema(profileSectionInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);

    if (parsedInput.section === 'summary') {
      await updateSummary({ user: ctx.user, cvId: cv.id, summary: parsedInput.payload.summary ?? null });
    } else if (parsedInput.section === 'contact') {
      const payload = parsedInput.payload;
      const { error } = await supabase
        .from('cv')
        .update({
          full_name: payload.fullName,
          location: payload.location,
          phone: payload.phone,
          contact_email: payload.contactEmail,
          linkedin_url: payload.linkedinUrl,
          github_url: payload.githubUrl,
          website_url: payload.websiteUrl,
        })
        .eq('id', cv.id)
        .eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (parsedInput.section === 'experience') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        company: payload.company,
        role: payload.role,
        location: payload.location ?? null,
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null,
        is_current: payload.isCurrent,
        summary: payload.summary ?? null,
        bullets: payload.bullets,
        stack: payload.stack,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        company: payload.company,
        role: payload.role,
        location: payload.location ?? null,
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null,
        is_current: payload.isCurrent,
        summary: payload.summary ?? null,
        bullets: payload.bullets,
        stack: payload.stack,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('experience')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('experience').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'project') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        name: payload.name,
        description: payload.description ?? null,
        link: payload.link || null,
        bullets: payload.bullets,
        stack: payload.stack,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        name: payload.name,
        description: payload.description ?? null,
        link: payload.link || null,
        bullets: payload.bullets,
        stack: payload.stack,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('project')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('project').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'skill') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        name: payload.name,
        category: payload.category ?? null,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        name: payload.name,
        category: payload.category ?? null,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('skill')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('skill').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'education') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        institution: payload.institution,
        degree: payload.degree ?? null,
        field: payload.field ?? null,
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null,
        summary: payload.summary ?? null,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        institution: payload.institution,
        degree: payload.degree ?? null,
        field: payload.field ?? null,
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null,
        summary: payload.summary ?? null,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('education')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('education').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'certification') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        name: payload.name,
        issuer: payload.issuer ?? null,
        issued_at: payload.issuedAt ?? null,
        expires_at: payload.expiresAt ?? null,
        link: payload.link || null,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        name: payload.name,
        issuer: payload.issuer ?? null,
        issued_at: payload.issuedAt ?? null,
        expires_at: payload.expiresAt ?? null,
        link: payload.link || null,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('certification')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('certification').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'language') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        cv_id: cv.id,
        position: payload.position,
        name: payload.name,
        proficiency: payload.proficiency ?? null,
      };
      const updatable = {
        user_id: ctx.user.id,
        position: payload.position,
        name: payload.name,
        proficiency: payload.proficiency ?? null,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('language')
          .update(updatable)
          .eq('id', payload.id)
          .eq('user_id', ctx.user.id)
          .eq('cv_id', cv.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('language').insert(insertable);
        if (error) throw new Error(error.message);
      }
    }

    const after = await loadCvSnapshot(ctx.user, cv.id);
    await recordCvVersion({ user: ctx.user, cvId: cv.id, before, after, source: 'manual' });
    await renderAndUploadCv({ user: ctx.user, cvId: cv.id });
    revalidatePath('/dashboard');
    return { ok: true as const };
  });

export const deleteProfileChild = authActionClient
  .inputSchema(deleteProfileChildSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    const section = parsedInput.section;
    const id = parsedInput.id;
    if (section === 'experience') {
      const { error } = await supabase
        .from('experience')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    } else if (section === 'project') {
      const { error } = await supabase
        .from('project')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    } else if (section === 'skill') {
      const { error } = await supabase
        .from('skill')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    } else if (section === 'education') {
      const { error } = await supabase
        .from('education')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    } else if (section === 'certification') {
      const { error } = await supabase
        .from('certification')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    } else if (section === 'language') {
      const { error } = await supabase
        .from('language')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.user.id)
        .eq('cv_id', cv.id);
      if (error) throw new Error(error.message);
    }
    const after = await loadCvSnapshot(ctx.user, cv.id);
    await recordCvVersion({ user: ctx.user, cvId: cv.id, before, after, source: 'manual' });
    await renderAndUploadCv({ user: ctx.user, cvId: cv.id });
    revalidatePath('/dashboard');
    return { ok: true as const };
  });
