'use server';

import { revalidatePath } from 'next/cache';

import { updateSummary } from '@/features/chat/services/profile-content-service';
import { renderAndUploadMasterCv } from '@/features/previewer/render';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { getOrCreateProfile } from '../controllers/get-profile';
import { deleteProfileChildSchema, profileSectionInputSchema } from '../schemas';

export const updateProfileSection = authActionClient
  .inputSchema(profileSectionInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const profile = await getOrCreateProfile();
    if (!profile) {
      throw new Error('Profile not available');
    }

    // Branches that change what the rendered master CV looks like flip this
    // so the PDF is re-rendered and /dashboard is revalidated below. Other
    // branches (contact, skill, education, certification, language) only
    // revalidate /profile, matching their previous behavior.
    let shouldRefreshPreview = false;

    if (parsedInput.section === 'summary') {
      await updateSummary({ user: ctx.user, summary: parsedInput.payload.summary ?? null });
      shouldRefreshPreview = true;
    } else if (parsedInput.section === 'contact') {
      const payload = parsedInput.payload;
      const { error } = await supabase
        .from('profile')
        .update({
          full_name: payload.fullName,
          location: payload.location,
          phone: payload.phone,
          contact_email: payload.contactEmail,
          linkedin_url: payload.linkedinUrl,
          github_url: payload.githubUrl,
          website_url: payload.websiteUrl,
        })
        .eq('id', profile.id)
        .eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (parsedInput.section === 'experience') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
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
        const { error } = await supabase.from('experience').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('experience').insert(insertable);
        if (error) throw new Error(error.message);
      }
      shouldRefreshPreview = true;
    } else if (parsedInput.section === 'project') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: payload.position,
        name: payload.name,
        description: payload.description ?? null,
        link: payload.link || null,
        bullets: payload.bullets,
        stack: payload.stack,
      };
      if (payload.id) {
        const { error } = await supabase.from('project').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('project').insert(insertable);
        if (error) throw new Error(error.message);
      }
      shouldRefreshPreview = true;
    } else if (parsedInput.section === 'skill') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: payload.position,
        name: payload.name,
        category: payload.category ?? null,
        level: payload.level ?? null,
      };
      if (payload.id) {
        const { error } = await supabase.from('skill').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('skill').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'education') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: payload.position,
        institution: payload.institution,
        degree: payload.degree ?? null,
        field: payload.field ?? null,
        start_date: payload.startDate ?? null,
        end_date: payload.endDate ?? null,
        summary: payload.summary ?? null,
      };
      if (payload.id) {
        const { error } = await supabase.from('education').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('education').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'certification') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: payload.position,
        name: payload.name,
        issuer: payload.issuer ?? null,
        issued_at: payload.issuedAt ?? null,
        expires_at: payload.expiresAt ?? null,
        link: payload.link || null,
      };
      if (payload.id) {
        const { error } = await supabase.from('certification').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('certification').insert(insertable);
        if (error) throw new Error(error.message);
      }
    } else if (parsedInput.section === 'language') {
      const payload = parsedInput.payload;
      const insertable = {
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: payload.position,
        name: payload.name,
        proficiency: payload.proficiency ?? null,
      };
      if (payload.id) {
        const { error } = await supabase.from('language').update(insertable).eq('id', payload.id).eq('user_id', ctx.user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('language').insert(insertable);
        if (error) throw new Error(error.message);
      }
    }

    if (shouldRefreshPreview) {
      await renderAndUploadMasterCv(ctx.user);
      revalidatePath('/dashboard');
    }
    revalidatePath('/profile');
    return { ok: true as const };
  });

export const deleteProfileChild = authActionClient
  .inputSchema(deleteProfileChildSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const section = parsedInput.section;
    const id = parsedInput.id;
    if (section === 'experience') {
      const { error } = await supabase.from('experience').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (section === 'project') {
      const { error } = await supabase.from('project').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (section === 'skill') {
      const { error } = await supabase.from('skill').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (section === 'education') {
      const { error } = await supabase.from('education').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (section === 'certification') {
      const { error } = await supabase.from('certification').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (section === 'language') {
      const { error } = await supabase.from('language').delete().eq('id', id).eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    }
    revalidatePath('/profile');
    return { ok: true as const };
  });
