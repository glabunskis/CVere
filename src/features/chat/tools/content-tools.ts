import { tool } from 'ai';

import { buildProfileSnapshot } from '@/features/chat/profile-snapshot';
import {
  addExperienceBullet,
  addProjectBullet,
  editExperienceBullet,
  editProjectBullet,
  removeExperienceBullet,
  removeProjectBullet,
  updateSummary,
} from '@/features/chat/services/profile-content-service';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
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
 * `profile-content-service` helpers; nothing here renders the PDF (the route
 * does that once per assistant turn after the stream finishes).
 *
 * Outputs are short human-readable strings. `readProfile` is the exception —
 * it returns the structured `aiProfileSchema` snapshot so the model can use
 * the UUIDs when calling mutating tools afterwards.
 */
export function buildContentTools(user: User) {
  return {
    readProfile: tool({
      description:
        'Snapshot the user\'s master CV profile. Always call this before editing ' +
        'experience or project bullets — the returned UUIDs are required inputs ' +
        'for the edit/add/remove tools.',
      inputSchema: readProfileInputSchema,
      execute: async () => {
        const profile = await getOrCreateProfile();
        if (!profile) throw new Error('Profile not available.');
        const children = await getProfileChildren(profile.id);
        const snapshot = buildProfileSnapshot(profile.summary, children);
        logger.info({ userId: user.id }, 'chat-tool readProfile');
        return snapshot;
      },
    }),

    rewriteSummary: tool({
      description:
        'Replace the user\'s profile summary with a new one. Keep it concrete, ' +
        'English, and based on facts already in the profile.',
      inputSchema: rewriteSummaryInputSchema,
      execute: async ({ summary }) => {
        await updateSummary({ user, summary });
        logger.info({ userId: user.id }, 'chat-tool rewriteSummary');
        return 'Updated profile summary.';
      },
    }),

    editExperienceBullet: tool({
      description:
        'Replace one bullet in an experience entry. Use `readProfile` first to ' +
        'find the experience UUID and the current bullet at the index you want.',
      inputSchema: editExperienceBulletInputSchema,
      execute: async ({ experienceId, index, text }) => {
        await editExperienceBullet({ user, experienceId, index, text });
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
        'end. Maximum 50 bullets per entry.',
      inputSchema: addExperienceBulletInputSchema,
      execute: async ({ experienceId, text, index }) => {
        await addExperienceBullet({ user, experienceId, text, index });
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
        'Remove one bullet from an experience entry by 0-based index.',
      inputSchema: removeExperienceBulletInputSchema,
      execute: async ({ experienceId, index }) => {
        await removeExperienceBullet({ user, experienceId, index });
        logger.info(
          { userId: user.id, experienceId, index },
          'chat-tool removeExperienceBullet',
        );
        return `Removed experience bullet ${index + 1}.`;
      },
    }),

    editProjectBullet: tool({
      description:
        'Replace one bullet in a project entry. Use `readProfile` first to find ' +
        'the project UUID and the current bullet at the index you want.',
      inputSchema: editProjectBulletInputSchema,
      execute: async ({ projectId, index, text }) => {
        await editProjectBullet({ user, projectId, index, text });
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
        'Maximum 50 bullets per entry.',
      inputSchema: addProjectBulletInputSchema,
      execute: async ({ projectId, text, index }) => {
        await addProjectBullet({ user, projectId, text, index });
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
      description: 'Remove one bullet from a project entry by 0-based index.',
      inputSchema: removeProjectBulletInputSchema,
      execute: async ({ projectId, index }) => {
        await removeProjectBullet({ user, projectId, index });
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

/**
 * Tool names that mutate CV data. The chat route uses this set to mark which
 * preview targets became dirty during a turn, then re-renders those targets
 * once at stream finish. Read-only and housekeeping tools are intentionally
 * excluded.
 *
 * Kept flat (single set) on purpose — sessions are generic in Phase 3+, so
 * every tool registers on every session and tool gating belongs in the tool
 * implementations themselves, not here.
 */
export const MUTATING_TOOLS: ReadonlySet<string> = new Set([
  // Summary + bullet ops (content-tools)
  'rewriteSummary',
  'editExperienceBullet',
  'addExperienceBullet',
  'removeExperienceBullet',
  'editProjectBullet',
  'addProjectBullet',
  'removeProjectBullet',
  // Bullet move (entry-tools)
  'moveExperienceBullet',
  'moveProjectBullet',
  // Entry lifecycle (entry-tools)
  'addExperience',
  'editExperience',
  'removeExperience',
  'moveExperience',
  'addProject',
  'editProject',
  'removeProject',
  'moveProject',
  // Section CRUD (section-tools)
  'addSkill',
  'editSkill',
  'removeSkill',
  'moveSkill',
  'addEducation',
  'editEducation',
  'removeEducation',
  'moveEducation',
  'addCertification',
  'editCertification',
  'removeCertification',
  'moveCertification',
  'addLanguage',
  'editLanguage',
  'removeLanguage',
  'moveLanguage',
  // Identity / contact (identity-tools)
  'setFullName',
  'setLocation',
  'setPhone',
  'setContactEmail',
  'setLinks',
  // Achievement integration (achievement-tools) — re-renders because section inserts land
  'integrateAchievement',
  // Style (style-tools)
  'setTemplate',
  'setAccentHex',
  'setEducationDateFormat',
  'setCertificationDateFormat',

]);
