import { tool } from 'ai';

import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import { listVacanciesInputSchema, readVacancyInputSchema } from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

const MAX_VACANCY_TEXT = 20_000;

/**
 * Vacancy-aware reading tools. Read-only — saved vacancies are managed
 * manually on `/vacancies`.
 *
 * If a lookup fails, tools throw and let the assistant recover naturally.
 */
export function buildVacancyTools(user: User, _activeCv: ActiveCvRef) {
  return {
    listVacancies: tool({
      description:
        'List the user\'s saved vacancies (job descriptions). Returns id, company (if set), ' +
        'role (if set), createdAt, and a short preview for each. Use this when the user refers ' +
        'to a vacancy by company/role/phrase to find the right id.',
      inputSchema: listVacanciesInputSchema,
      execute: async () => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
          .from('job_description')
          .select('id, company, role, created_at, raw_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          throw new Error(error.message);
        }
        const rows = data ?? [];
        logger.info({ userId: user.id, count: rows.length }, 'chat-tool listVacancies');
        return rows.map((row) => ({
          id: row.id,
          company: row.company,
          role: row.role,
          createdAt: row.created_at,
          preview: previewText(row.raw_text),
        }));
      },
    }),

    readVacancy: tool({
      description:
        'Read the full saved vacancy text by id. Use the returned text to inform tailoring. ' +
        'Do not invent details the vacancy does not contain.',
      inputSchema: readVacancyInputSchema,
      execute: async ({ vacancyId }) => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
          .from('job_description')
          .select('id, company, role, created_at, raw_text')
          .eq('id', vacancyId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          throw new Error(error.message);
        }
        if (!data) {
          throw new Error(`Vacancy ${vacancyId} not found.`);
        }
        logger.info({ userId: user.id, vacancyId }, 'chat-tool readVacancy');
        return {
          id: data.id,
          company: data.company,
          role: data.role,
          createdAt: data.created_at,
          text: data.raw_text.slice(0, MAX_VACANCY_TEXT),
        };
      },
    }),
  } as const;
}

function previewText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length <= 200 ? trimmed : `${trimmed.slice(0, 197)}...`;
}

export const VACANCY_TOOL_NAMES = ['listVacancies', 'readVacancy'] as const;
