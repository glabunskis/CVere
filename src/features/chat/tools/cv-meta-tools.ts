import { tool } from 'ai';

import {
  createCv as createCvRecord,
  getSelectedCv,
  listCvRows,
  setSelectedCv,
} from '@/entities/cv';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import { createCvInputSchema, listCvsInputSchema } from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

type CvCreatedHandler = (info: { cvId: string; title: string }) => void | Promise<void>;

/**
 * CV metadata tools: discover CVs and create new ones (copies).
 */
export function buildCvMetaTools(
  user: User,
  activeCv: ActiveCvRef,
  onCvCreated: CvCreatedHandler,
) {
  return {
    listCvs: tool({
      description:
        'List the user\'s CVs (CV variants). Returns id, title, isDefault, and isSelected for each. ' +
        'Use this to discover other CVs owned by the user when they refer to another CV or ask about their CVs.',
      inputSchema: listCvsInputSchema,
      execute: async () => {
        const rows = await listCvRows(user.id);
        const selected = await getSelectedCv(user.id);
        logger.info({ userId: user.id, count: rows.length }, 'chat-tool listCvs');
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          isDefault: row.is_default,
          isSelected: row.id === selected.id,
        }));
      },
    }),

    createCv: tool({
      description:
        'Create a new CV as a copy of an existing one and make it the selected CV. The copy ' +
        'duplicates the source\'s summary, entries, identity, and style. By default the source ' +
        'is the currently selected CV. Use this before tailoring to a vacancy so the original ' +
        'CV is left untouched — then edit the new copy (it becomes the target for subsequent ' +
        'tool calls in this turn). Pass sourceVacancyId to link the copy to a vacancy.',
      inputSchema: createCvInputSchema,
      execute: async ({ title, sourceCvId, sourceVacancyId }) => {
        const row = await createCvRecord({
          userId: user.id,
          title,
          sourceCvId: sourceCvId ?? activeCv.current,
          sourceVacancyId: sourceVacancyId ?? null,
        });
        await setSelectedCv(user.id, row.id);
        // Subsequent tool calls this turn target the new copy unless the model
        // passes an explicit cvId.
        activeCv.current = row.id;
        await onCvCreated({ cvId: row.id, title: row.title });
        logger.info({ userId: user.id, cvId: row.id, sourceCvId: sourceCvId ?? null }, 'chat-tool createCv');
        return `Created "${row.title}" as a copy and switched to it. Edits now target this new CV.`;
      },
    }),
  } as const;
}

export const CV_META_TOOL_NAMES = ['listCvs', 'createCv'] as const;
