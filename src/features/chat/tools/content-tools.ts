import { tool } from 'ai';

import { getCvChildren } from '@/features/cv/controllers/get-cv-children';
import { buildCvSnapshot } from '@/features/cv/cv-snapshot';
import {
  addExperienceBullet,
  addProjectBullet,
  editExperienceBullet,
  editProjectBullet,
  getCv,
  removeExperienceBullet,
  removeProjectBullet,
  updateSummary,
} from '@/features/cv/services/cv-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  addExperienceBulletInputSchema,
  addProjectBulletInputSchema,
  editExperienceBulletInputSchema,
  editProjectBulletInputSchema,
  readProfileInputSchema,
  removeExperienceBulletInputSchema,
  removeProjectBulletInputSchema,
  rewriteSummaryInputSchema,
} from '../schemas';

import 'server-only';

/**
 * Content tools for the chat agent. Tools delegate to the shared
 * CV service helpers; nothing here renders the PDF (the route
 * does that once per assistant turn after the stream finishes).
 *
 * Outputs are short human-readable strings. `readProfile` is the exception —
 * it returns the structured `aiProfileSchema` snapshot so the model can use
 * the UUIDs when calling mutating tools afterwards.
 */
export function buildContentTools(user: User, activeCvId: string) {
  return {
    readProfile: tool({
      description:
        'Return a snapshot of the selected CV (summary, entries, ids, ordering). ' +
        'Call this before editing existing items so ids and indices are current.',
      inputSchema: readProfileInputSchema,
      execute: async () => {
        const cv = await getCv(activeCvId, user.id);
        const children = await getCvChildren(activeCvId);
        const snapshot = buildCvSnapshot(cv.summary, children);
        logger.info({ userId: user.id }, 'chat-tool readProfile');
        return snapshot;
      },
    }),

    rewriteSummary: tool({
      description:
        'Replace the CV summary. Keep it concrete, English, and based on facts ' +
        'already in the CV. Omit cvId to target the selected CV.',
      inputSchema: rewriteSummaryInputSchema,
      execute: async ({ cvId, summary }) => {
        const targetCvId = cvId ?? activeCvId;
        await updateSummary({ user, cvId: targetCvId, summary });
        logger.info({ userId: user.id }, 'chat-tool rewriteSummary');
        return 'Updated CV summary.';
      },
    }),

    editExperienceBullet: tool({
      description:
        'Replace one bullet in an experience entry. Call `readProfile` first to ' +
        'find the experience UUID and the current bullet at the index you want. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: editExperienceBulletInputSchema,
      execute: async ({ cvId, experienceId, index, text }) => {
        const targetCvId = cvId ?? activeCvId;
        await editExperienceBullet({ user, cvId: targetCvId, experienceId, index, text });
        logger.info(
          { userId: user.id, experienceId, index },
          'chat-tool editExperienceBullet',
        );
        return `Edited experience bullet ${index + 1}.`;
      },
    }),

    addExperienceBullet: tool({
      description:
        'Add a new bullet to an experience entry. Omit `index` to append at the ' +
        'end. Maximum 50 bullets per entry. Omit cvId to target the selected CV.',
      inputSchema: addExperienceBulletInputSchema,
      execute: async ({ cvId, experienceId, text, index }) => {
        const targetCvId = cvId ?? activeCvId;
        await addExperienceBullet({ user, cvId: targetCvId, experienceId, text, index });
        logger.info(
          { userId: user.id, experienceId, index: index ?? null },
          'chat-tool addExperienceBullet',
        );
        return index === undefined
          ? 'Appended an experience bullet.'
          : `Inserted an experience bullet at position ${index + 1}.`;
      },
    }),

    removeExperienceBullet: tool({
      description:
        'Remove one bullet from an experience entry by 0-based index. Omit cvId ' +
        'to target the selected CV.',
      inputSchema: removeExperienceBulletInputSchema,
      execute: async ({ cvId, experienceId, index }) => {
        const targetCvId = cvId ?? activeCvId;
        await removeExperienceBullet({ user, cvId: targetCvId, experienceId, index });
        logger.info(
          { userId: user.id, experienceId, index },
          'chat-tool removeExperienceBullet',
        );
        return `Removed experience bullet ${index + 1}.`;
      },
    }),

    editProjectBullet: tool({
      description:
        'Replace one bullet in a project entry. Call `readProfile` first to find ' +
        'the project UUID and the current bullet at the index you want. Omit cvId ' +
        'to target the selected CV.',
      inputSchema: editProjectBulletInputSchema,
      execute: async ({ cvId, projectId, index, text }) => {
        const targetCvId = cvId ?? activeCvId;
        await editProjectBullet({ user, cvId: targetCvId, projectId, index, text });
        logger.info(
          { userId: user.id, projectId, index },
          'chat-tool editProjectBullet',
        );
        return `Edited project bullet ${index + 1}.`;
      },
    }),

    addProjectBullet: tool({
      description:
        'Add a new bullet to a project entry. Omit `index` to append at the end. ' +
        'Maximum 50 bullets per entry. Omit cvId to target the selected CV.',
      inputSchema: addProjectBulletInputSchema,
      execute: async ({ cvId, projectId, text, index }) => {
        const targetCvId = cvId ?? activeCvId;
        await addProjectBullet({ user, cvId: targetCvId, projectId, text, index });
        logger.info(
          { userId: user.id, projectId, index: index ?? null },
          'chat-tool addProjectBullet',
        );
        return index === undefined
          ? 'Appended a project bullet.'
          : `Inserted a project bullet at position ${index + 1}.`;
      },
    }),

    removeProjectBullet: tool({
      description:
        'Remove one bullet from a project entry by 0-based index. Omit cvId to ' +
        'target the selected CV.',
      inputSchema: removeProjectBulletInputSchema,
      execute: async ({ cvId, projectId, index }) => {
        const targetCvId = cvId ?? activeCvId;
        await removeProjectBullet({ user, cvId: targetCvId, projectId, index });
        logger.info(
          { userId: user.id, projectId, index },
          'chat-tool removeProjectBullet',
        );
        return `Removed project bullet ${index + 1}.`;
      },
    }),
  } as const;
}

export const CONTENT_TOOL_NAMES = [
  'readProfile',
  'rewriteSummary',
  'editExperienceBullet',
  'addExperienceBullet',
  'removeExperienceBullet',
  'editProjectBullet',
  'addProjectBullet',
  'removeProjectBullet',
] as const;
