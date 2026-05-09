import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type ExperienceRow = Tables<'experience'>;
export type ProjectRow = Tables<'project'>;
export type SkillRow = Tables<'skill'>;
export type EducationRow = Tables<'education'>;
export type CertificationRow = Tables<'certification'>;
export type LanguageRow = Tables<'language'>;

export type ProfileChildren = {
  experience: ExperienceRow[];
  project: ProjectRow[];
  skill: SkillRow[];
  education: EducationRow[];
  certification: CertificationRow[];
  language: LanguageRow[];
};

export async function getProfileChildren(profileId: string): Promise<ProfileChildren> {
  const supabase = await createSupabaseServerClient();

  const [experience, project, skill, education, certification, language] = await Promise.all([
    supabase.from('experience').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('project').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('skill').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase.from('education').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
    supabase
      .from('certification')
      .select('*')
      .eq('profile_id', profileId)
      .order('position', { ascending: true }),
    supabase.from('language').select('*').eq('profile_id', profileId).order('position', { ascending: true }),
  ]);

  return {
    experience: experience.data ?? [],
    project: project.data ?? [],
    skill: skill.data ?? [],
    education: education.data ?? [],
    certification: certification.data ?? [],
    language: language.data ?? [],
  };
}
