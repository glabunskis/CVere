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
} from '@/features/chat/services/profile-content-service';
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

import 'server-only';

/**
 * Lifecycle tools for experience and project entries. The existing
 * bullet-level tools (add/edit/remove) live in `content-tools.ts`. These
 * tools cover the parent entry: create, edit fields, delete, reorder, plus
 * reordering bullets inside an entry.
 */
export function buildEntryTools(user: User) {
  return {
    // ---------- Experience ----------
    addExperience: tool({
      description:
        'Append a new experience entry. Required: company and role. Optional bullets can be ' +
        'passed in; you can also leave the entry empty and add bullets later via ' +
        '`addExperienceBullet`. New entries land at the bottom; use `moveExperience` to reorder.',
      inputSchema: addExperienceInputSchema,
      execute: async ({
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
        const row = await addExperience({
          user,
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
        'Provide only the fields you want to change.',
      inputSchema: editExperienceInputSchema,
      execute: async ({
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
        const row = await editExperience({
          user,
          experienceId,
          patch: { company, role, location, startDate, endDate, isCurrent, summary, stack },
        });
        logger.info({ userId: user.id, experienceId }, 'chat-tool editExperience');
        return `Updated experience: ${row.role} at ${row.company}.`;
      },
    }),

    removeExperience: tool({
      description:
        'Delete an entire experience entry and all its bullets. Confirm with the user first.',
      inputSchema: removeExperienceInputSchema,
      execute: async ({ experienceId }) => {
        await removeExperience({ user, experienceId });
        logger.info({ userId: user.id, experienceId }, 'chat-tool removeExperience');
        return 'Removed experience entry.';
      },
    }),

    moveExperience: tool({
      description:
        'Reorder an experience entry. `toIndex` is the new 0-based position; the topmost ' +
        'entry is index 0.',
      inputSchema: moveExperienceInputSchema,
      execute: async ({ experienceId, toIndex }) => {
        await moveExperience({ user, experienceId, toIndex });
        logger.info({ userId: user.id, experienceId, toIndex }, 'chat-tool moveExperience');
        return `Moved experience entry to position ${toIndex + 1}.`;
      },
    }),

    moveExperienceBullet: tool({
      description:
        'Reorder one bullet inside an experience entry. Both indices are 0-based. Use ' +
        '`readProfile` to see the current order.',
      inputSchema: moveExperienceBulletInputSchema,
      execute: async ({ experienceId, fromIndex, toIndex }) => {
        await moveExperienceBullet({ user, experienceId, fromIndex, toIndex });
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
        'you can also leave the entry empty and add bullets later via `addProjectBullet`.',
      inputSchema: addProjectInputSchema,
      execute: async ({ name, description, link, bullets, stack }) => {
        const row = await addProject({
          user,
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
        'fields you want to change.',
      inputSchema: editProjectInputSchema,
      execute: async ({ projectId, name, description, link, stack }) => {
        const row = await editProject({
          user,
          projectId,
          patch: { name, description, link, stack },
        });
        logger.info({ userId: user.id, projectId }, 'chat-tool editProject');
        return `Updated project "${row.name}".`;
      },
    }),

    removeProject: tool({
      description:
        'Delete an entire project entry and all its bullets. Confirm with the user first.',
      inputSchema: removeProjectInputSchema,
      execute: async ({ projectId }) => {
        await removeProject({ user, projectId });
        logger.info({ userId: user.id, projectId }, 'chat-tool removeProject');
        return 'Removed project entry.';
      },
    }),

    moveProject: tool({
      description: 'Reorder a project entry. `toIndex` is the new 0-based position.',
      inputSchema: moveProjectInputSchema,
      execute: async ({ projectId, toIndex }) => {
        await moveProject({ user, projectId, toIndex });
        logger.info({ userId: user.id, projectId, toIndex }, 'chat-tool moveProject');
        return `Moved project entry to position ${toIndex + 1}.`;
      },
    }),

    moveProjectBullet: tool({
      description:
        'Reorder one bullet inside a project entry. Both indices are 0-based. Use ' +
        '`readProfile` to see the current order.',
      inputSchema: moveProjectBulletInputSchema,
      execute: async ({ projectId, fromIndex, toIndex }) => {
        await moveProjectBullet({ user, projectId, fromIndex, toIndex });
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
