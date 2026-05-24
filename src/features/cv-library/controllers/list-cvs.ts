import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import 'server-only';

export type MasterCvSummary = {
  kind: 'master';
  title: 'Master CV';
  updatedAt: string | null;
};

export type TailoredCvSummary = {
  kind: 'tailored_cv';
  id: string;
  title: string;
  jobDescriptionId: string | null;
  jobDescriptionLabel: string | null;
  updatedAt: string;
};

export type CvLibraryData = {
  master: MasterCvSummary;
  tailored: TailoredCvSummary[];
};

function toVacancyLabel({ role, company }: { role: string | null; company: string | null }): string | null {
  if (role && company) return `${role} at ${company}`;
  if (role) return role;
  if (company) return company;
  return null;
}

export async function listCvs(): Promise<CvLibraryData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      master: { kind: 'master', title: 'Master CV', updatedAt: null },
      tailored: [],
    };
  }

  const [{ data: profile }, { data: tailoredRows, error: tailoredError }] = await Promise.all([
    supabase.from('profile').select('updated_at').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('tailored_cv')
      .select('id, title, job_description_id, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (tailoredError) {
    throw new Error(tailoredError.message);
  }

  const tailored = tailoredRows ?? [];
  const jobIds = tailored
    .map((row) => row.job_description_id)
    .filter((id): id is string => typeof id === 'string');

  const vacancyLabelById = new Map<string, string | null>();
  if (jobIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from('job_description')
      .select('id, role, company')
      .in('id', jobIds);
    if (jobsError) {
      throw new Error(jobsError.message);
    }
    for (const job of jobs ?? []) {
      vacancyLabelById.set(job.id, toVacancyLabel(job));
    }
  }

  return {
    master: {
      kind: 'master',
      title: 'Master CV',
      updatedAt: profile?.updated_at ?? null,
    },
    tailored: tailored.map((row) => ({
      kind: 'tailored_cv',
      id: row.id,
      title: row.title,
      jobDescriptionId: row.job_description_id,
      jobDescriptionLabel: row.job_description_id
        ? vacancyLabelById.get(row.job_description_id) ?? null
        : null,
      updatedAt: row.updated_at,
    })),
  };
}
