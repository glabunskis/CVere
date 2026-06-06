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

export async function getCvChildren(cvId: string): Promise<ProfileChildren> {
  const supabase = await createSupabaseServerClient();

  const [experience, project, skill, education, certification, language] = await Promise.all([
    supabase.from('experience').select('*').eq('cv_id', cvId).order('position', { ascending: true }),
    supabase.from('project').select('*').eq('cv_id', cvId).order('position', { ascending: true }),
    supabase.from('skill').select('*').eq('cv_id', cvId).order('position', { ascending: true }),
    supabase.from('education').select('*').eq('cv_id', cvId).order('position', { ascending: true }),
    supabase
      .from('certification')
      .select('*')
      .eq('cv_id', cvId)
      .order('position', { ascending: true }),
    supabase.from('language').select('*').eq('cv_id', cvId).order('position', { ascending: true }),
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
