import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';

import 'server-only';

export type CvLibraryItem = {
  id: string;
  title: string;
  isDefault: boolean;
  sourceVacancyId: string | null;
  jobDescriptionLabel: string | null;
  template: 'single-column' | 'two-column';
  accentHex: string;
  educationDateFormat: 'year' | 'mm_yyyy' | 'mon_yyyy' | 'mon_d_yyyy';
  certificationDateFormat: 'year' | 'mm_yyyy' | 'mon_yyyy' | 'mon_d_yyyy';
  updatedAt: string;
};

export type CvLibraryData = {
  selectedCvId: string | null;
  items: CvLibraryItem[];
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
      selectedCvId: null,
      items: [],
    };
  }

  const [{ data: prefs }, { data: cvRows, error: cvError }] = await Promise.all([
    supabase.from('cv_preferences').select('selected_cv_id').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('cv')
      .select(
        'id, title, is_default, source_vacancy_id, template, accent_hex, education_date_format, certification_date_format, updated_at',
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (cvError) {
    throw new Error(cvError.message);
  }

  const rows = cvRows ?? [];
  const selectedCvId =
    prefs?.selected_cv_id ?? rows.find((row) => row.is_default)?.id ?? rows[0]?.id ?? null;
  const jobIds = rows
    .map((row) => row.source_vacancy_id)
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
    selectedCvId,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      isDefault: row.is_default,
      sourceVacancyId: row.source_vacancy_id,
      jobDescriptionLabel: row.source_vacancy_id
        ? vacancyLabelById.get(row.source_vacancy_id) ?? null
        : null,
      template: row.template,
      accentHex: row.accent_hex,
      educationDateFormat: row.education_date_format,
      certificationDateFormat: row.certification_date_format,
      updatedAt: row.updated_at,
    })),
  };
}
