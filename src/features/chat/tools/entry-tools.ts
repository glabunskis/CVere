import { tool } from 'ai';

import {
  addExperience,
  addProject,
  editExperience,
  editProject,
  moveExperience,
  moveExperienceBullet,
  moveProject,
  moveProjectBullet,
  removeExperience,
  removeProject,
} from '@/features/cv/services/cv-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  addExperienceInputSchema,
  addProjectInputSchema,
  editExperienceInputSchema,
  editProjectInputSchema,
  moveExperienceBulletInputSchema,
  moveExperienceInputSchema,
  moveProjectBulletInputSchema,
  moveProjectInputSchema,
  removeExperienceInputSchema,
  removeProjectInputSchema,
} from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Lifecycle tools for experience and project entries. The existing
 * bullet-level tools (add/edit/remove) live in `content-tools.ts`. These
 * tools cover the parent entry: create, edit fields, delete, reorder, plus
 * reordering bullets inside an entry.
 */
export function buildEntryTools(user: User, activeCv: ActiveCvRef) {
  return {
    // ---------- Experience ----------
    addExperience: tool({
      description:
        'Append a new experience entry. Required: company and role. Optional bullets can be ' +
        'passed in; you can also leave the entry empty and add bullets later via ' +
        '`addExperienceBullet`. New entries land at the bottom; use `moveExperience` to reorder. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: addExperienceInputSchema,
      execute: async ({
        cvId,
        company,
        role,
        location,
        startDate,
        endDate,
        isCurrent,
        summary,
        bullets,
        stack,
      }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addExperience({
          user,
          cvId: targetCvId,
          payload: {
            company,
            role,
            location,
            startDate,
            endDate,
            isCurrent,
            summary,
            bullets,
            stack,
          },
        });
        logger.info({ userId: user.id, experienceId: row.id }, 'chat-tool addExperience');
        return `Added experience: ${row.role} at ${row.company}.`;
      },
    }),

    editExperience: tool({
      description:
        'Edit fields on an existing experience entry (company, role, dates, location, summary, ' +
        'isCurrent, stack). Bullets are managed by the dedicated bullet tools — do not pass them here. ' +
        'Provide only the fields you want to change. Omit cvId to target the selected CV.',
      inputSchema: editExperienceInputSchema,
      execute: async ({
        cvId,
        experienceId,
        company,
        role,
        location,
        startDate,
        endDate,
        isCurrent,
        summary,
        stack,
      }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editExperience({
          user,
          cvId: targetCvId,
          experienceId,
          patch: { company, role, location, startDate, endDate, isCurrent, summary, stack },
        });
        logger.info({ userId: user.id, experienceId }, 'chat-tool editExperience');
        return `Updated experience: ${row.role} at ${row.company}.`;
      },
    }),

    removeExperience: tool({
      description:
        'Delete an entire experience entry and all its bullets. Confirm with the user first. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: removeExperienceInputSchema,
      execute: async ({ cvId, experienceId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeExperience({ user, cvId: targetCvId, experienceId });
        logger.info({ userId: user.id, experienceId }, 'chat-tool removeExperience');
        return 'Removed experience entry.';
      },
    }),

    moveExperience: tool({
      description:
        'Reorder an experience entry. `toIndex` is the new 0-based position; the topmost ' +
        'entry is index 0. Omit cvId to target the selected CV.',
      inputSchema: moveExperienceInputSchema,
      execute: async ({ cvId, experienceId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveExperience({ user, cvId: targetCvId, experienceId, toIndex });
        logger.info({ userId: user.id, experienceId, toIndex }, 'chat-tool moveExperience');
        return `Moved experience entry to position ${toIndex + 1}.`;
      },
    }),

    moveExperienceBullet: tool({
      description:
        'Reorder one bullet inside an experience entry. Both indices are 0-based. Call ' +
        '`readProfile` to see the current order. Omit cvId to target the selected CV.',
      inputSchema: moveExperienceBulletInputSchema,
      execute: async ({ cvId, experienceId, fromIndex, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveExperienceBullet({ user, cvId: targetCvId, experienceId, fromIndex, toIndex });
        logger.info(
          { userId: user.id, experienceId, fromIndex, toIndex },
          'chat-tool moveExperienceBullet',
        );
        return `Moved bullet ${fromIndex + 1} to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Projects ----------
    addProject: tool({
      description:
        'Append a new project entry. Required: name. Optional bullets can be passed in; ' +
        'you can also leave the entry empty and add bullets later via `addProjectBullet`. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: addProjectInputSchema,
      execute: async ({ cvId, name, description, link, bullets, stack }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addProject({
          user,
          cvId: targetCvId,
          payload: { name, description, link, bullets, stack },
        });
        logger.info({ userId: user.id, projectId: row.id }, 'chat-tool addProject');
        return `Added project "${row.name}".`;
      },
    }),

    editProject: tool({
      description:
        'Edit fields on an existing project entry (name, description, link, stack). Bullets ' +
        'are managed by the dedicated bullet tools — do not pass them here. Provide only the ' +
        'fields you want to change. Omit cvId to target the selected CV.',
      inputSchema: editProjectInputSchema,
      execute: async ({ cvId, projectId, name, description, link, stack }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editProject({
          user,
          cvId: targetCvId,
          projectId,
          patch: { name, description, link, stack },
        });
        logger.info({ userId: user.id, projectId }, 'chat-tool editProject');
        return `Updated project "${row.name}".`;
      },
    }),

    removeProject: tool({
      description:
        'Delete an entire project entry and all its bullets. Confirm with the user first. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: removeProjectInputSchema,
      execute: async ({ cvId, projectId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeProject({ user, cvId: targetCvId, projectId });
        logger.info({ userId: user.id, projectId }, 'chat-tool removeProject');
        return 'Removed project entry.';
      },
    }),

    moveProject: tool({
      description:
        'Reorder a project entry. `toIndex` is the new 0-based position. Omit cvId to target ' +
        'the selected CV.',
      inputSchema: moveProjectInputSchema,
      execute: async ({ cvId, projectId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveProject({ user, cvId: targetCvId, projectId, toIndex });
        logger.info({ userId: user.id, projectId, toIndex }, 'chat-tool moveProject');
        return `Moved project entry to position ${toIndex + 1}.`;
      },
    }),

    moveProjectBullet: tool({
      description:
        'Reorder one bullet inside a project entry. Both indices are 0-based. Call ' +
        '`readProfile` to see the current order. Omit cvId to target the selected CV.',
      inputSchema: moveProjectBulletInputSchema,
      execute: async ({ cvId, projectId, fromIndex, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveProjectBullet({ user, cvId: targetCvId, projectId, fromIndex, toIndex });
        logger.info(
          { userId: user.id, projectId, fromIndex, toIndex },
          'chat-tool moveProjectBullet',
        );
        return `Moved bullet ${fromIndex + 1} to position ${toIndex + 1}.`;
      },
    }),
  } as const;
}

export const ENTRY_TOOL_NAMES = [
  'addExperience',
  'editExperience',
  'removeExperience',
  'moveExperience',
  'moveExperienceBullet',
  'addProject',
  'editProject',
  'removeProject',
  'moveProject',
  'moveProjectBullet',
] as const;
