import { tool } from 'ai';

import {
  addTailoredExperienceBullet,
  addTailoredProjectBullet,
  applyTailoredStylePatch,
  createTailoredCv,
  deleteTailoredCv,
  editTailoredExperienceBullet,
  editTailoredProjectBullet,
  listTailoredCvs,
  readTailoredCv,
  removeTailoredExperienceBullet,
  removeTailoredProjectBullet,
  renameTailoredCv,
  updateTailoredSummary,
} from '@/features/chat/services/tailored-content-service';
import type { PreviewTarget } from '@/features/previewer/preview-target';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  addTailoredExperienceBulletInputSchema,
  addTailoredProjectBulletInputSchema,
  createTailoredCvInputSchema,
  deleteTailoredCvInputSchema,
  editTailoredExperienceBulletInputSchema,
  editTailoredProjectBulletInputSchema,
  listTailoredCvsInputSchema,
  readTailoredCvInputSchema,
  removeTailoredExperienceBulletInputSchema,
  removeTailoredProjectBulletInputSchema,
  renameTailoredCvInputSchema,
  rewriteTailoredSummaryInputSchema,
  setTailoredAccentHexInputSchema,
  setTailoredTemplateInputSchema,
} from '../schemas';

import 'server-only';

type BuildTailoredToolsOptions = {
  previewing: PreviewTarget | null;
  onPreviewSwitch?: (target: PreviewTarget) => void;
  onCreatedTailoredCv?: (tailoredCvId: string) => void;
};

export function buildTailoredTools(user: User, options: BuildTailoredToolsOptions) {
  return {
    listTailoredCvs: tool({
      description:
        'List the user\'s tailored CV variants with ids and titles. Call this when the user references a tailored CV by name and the current preview context is ambiguous.',
      inputSchema: listTailoredCvsInputSchema,
      execute: async () => {
        const rows = await listTailoredCvs(user);
        logger.info({ userId: user.id, count: rows.length }, 'chat-tool listTailoredCvs');
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          jobDescriptionId: row.job_description_id,
          updatedAt: row.updated_at,
        }));
      },
    }),

    createTailoredCv: tool({
      description:
        'Create a new tailored CV from the current master profile snapshot. Returns the new tailoredCvId. Use this instead of mutating the master CV when the user asks for tailoring.',
      inputSchema: createTailoredCvInputSchema,
      execute: async ({ title, jobDescriptionId }) => {
        const row = await createTailoredCv({ user, title, jobDescriptionId });
        logger.info(
          { userId: user.id, tailoredCvId: row.id, jobDescriptionId: row.job_description_id },
          'chat-tool createTailoredCv',
        );
        options.onCreatedTailoredCv?.(row.id);
        options.onPreviewSwitch?.({ kind: 'tailored_cv', refId: row.id });
        return { tailoredCvId: row.id, title: row.title };
      },
    }),

    readTailoredCv: tool({
      description:
        'Read a tailored CV variant by id. Returns the frozen source snapshot, current overrides, and merged profile view used for rendering.',
      inputSchema: readTailoredCvInputSchema,
      execute: async ({ tailoredCvId }) => {
        const { row, snapshot, sections, mergedProfile } = await readTailoredCv({
          user,
          tailoredCvId,
        });
        logger.info({ userId: user.id, tailoredCvId }, 'chat-tool readTailoredCv');
        return {
          id: row.id,
          title: row.title,
          jobDescriptionId: row.job_description_id,
          template: row.template,
          accentHex: row.accent_hex,
          summaryOverride: row.summary,
          overrides: sections,
          sourceSnapshot: snapshot,
          profile: mergedProfile,
          updatedAt: row.updated_at,
        };
      },
    }),

    rewriteTailoredSummary: tool({
      description:
        'Replace the tailored CV summary override. Keeps master profile unchanged.',
      inputSchema: rewriteTailoredSummaryInputSchema,
      execute: async ({ tailoredCvId, text }) => {
        await updateTailoredSummary({ user, tailoredCvId, summary: text });
        logger.info({ userId: user.id, tailoredCvId }, 'chat-tool rewriteTailoredSummary');
        return 'Updated tailored CV summary.';
      },
    }),

    editTailoredExperienceBullet: tool({
      description:
        'Replace one experience bullet in a tailored CV override by 0-based index.',
      inputSchema: editTailoredExperienceBulletInputSchema,
      execute: async ({ tailoredCvId, experienceId, index, text }) => {
        await editTailoredExperienceBullet({ user, tailoredCvId, experienceId, index, text });
        logger.info(
          { userId: user.id, tailoredCvId, experienceId, index },
          'chat-tool editTailoredExperienceBullet',
        );
        return `Edited tailored experience bullet ${index + 1}.`;
      },
    }),

    addTailoredExperienceBullet: tool({
      description:
        'Add a new experience bullet in a tailored CV override. Omit index to append.',
      inputSchema: addTailoredExperienceBulletInputSchema,
      execute: async ({ tailoredCvId, experienceId, text, index }) => {
        await addTailoredExperienceBullet({ user, tailoredCvId, experienceId, text, index });
        logger.info(
          { userId: user.id, tailoredCvId, experienceId, index: index ?? null },
          'chat-tool addTailoredExperienceBullet',
        );
        return index === undefined
          ? 'Appended tailored experience bullet.'
          : `Inserted tailored experience bullet at position ${index + 1}.`;
      },
    }),

    removeTailoredExperienceBullet: tool({
      description: 'Remove one experience bullet in a tailored CV override by 0-based index.',
      inputSchema: removeTailoredExperienceBulletInputSchema,
      execute: async ({ tailoredCvId, experienceId, index }) => {
        await removeTailoredExperienceBullet({ user, tailoredCvId, experienceId, index });
        logger.info(
          { userId: user.id, tailoredCvId, experienceId, index },
          'chat-tool removeTailoredExperienceBullet',
        );
        return `Removed tailored experience bullet ${index + 1}.`;
      },
    }),

    editTailoredProjectBullet: tool({
      description:
        'Replace one project bullet in a tailored CV override by 0-based index.',
      inputSchema: editTailoredProjectBulletInputSchema,
      execute: async ({ tailoredCvId, projectId, index, text }) => {
        await editTailoredProjectBullet({ user, tailoredCvId, projectId, index, text });
        logger.info(
          { userId: user.id, tailoredCvId, projectId, index },
          'chat-tool editTailoredProjectBullet',
        );
        return `Edited tailored project bullet ${index + 1}.`;
      },
    }),

    addTailoredProjectBullet: tool({
      description:
        'Add a new project bullet in a tailored CV override. Omit index to append.',
      inputSchema: addTailoredProjectBulletInputSchema,
      execute: async ({ tailoredCvId, projectId, text, index }) => {
        await addTailoredProjectBullet({ user, tailoredCvId, projectId, text, index });
        logger.info(
          { userId: user.id, tailoredCvId, projectId, index: index ?? null },
          'chat-tool addTailoredProjectBullet',
        );
        return index === undefined
          ? 'Appended tailored project bullet.'
          : `Inserted tailored project bullet at position ${index + 1}.`;
      },
    }),

    removeTailoredProjectBullet: tool({
      description: 'Remove one project bullet in a tailored CV override by 0-based index.',
      inputSchema: removeTailoredProjectBulletInputSchema,
      execute: async ({ tailoredCvId, projectId, index }) => {
        await removeTailoredProjectBullet({ user, tailoredCvId, projectId, index });
        logger.info(
          { userId: user.id, tailoredCvId, projectId, index },
          'chat-tool removeTailoredProjectBullet',
        );
        return `Removed tailored project bullet ${index + 1}.`;
      },
    }),

    setTailoredAccentHex: tool({
      description:
        'Set or clear an accent color override for a tailored CV. Null clears and falls back to user-level preferences.',
      inputSchema: setTailoredAccentHexInputSchema,
      execute: async ({ tailoredCvId, hex }) => {
        await applyTailoredStylePatch({ user, tailoredCvId, patch: { accentHex: hex } });
        logger.info({ userId: user.id, tailoredCvId, hex }, 'chat-tool setTailoredAccentHex');
        return hex ? `Set tailored accent color to ${hex}.` : 'Cleared tailored accent override.';
      },
    }),

    setTailoredTemplate: tool({
      description:
        'Set or clear a template override for a tailored CV. Null clears and falls back to user-level preferences.',
      inputSchema: setTailoredTemplateInputSchema,
      execute: async ({ tailoredCvId, template }) => {
        await applyTailoredStylePatch({ user, tailoredCvId, patch: { template } });
        logger.info({ userId: user.id, tailoredCvId, template }, 'chat-tool setTailoredTemplate');
        return template
          ? `Set tailored template to ${template}.`
          : 'Cleared tailored template override.';
      },
    }),

    renameTailoredCv: tool({
      description: 'Rename a tailored CV variant.',
      inputSchema: renameTailoredCvInputSchema,
      execute: async ({ tailoredCvId, title }) => {
        const row = await renameTailoredCv({ user, tailoredCvId, title });
        logger.info({ userId: user.id, tailoredCvId }, 'chat-tool renameTailoredCv');
        return `Renamed tailored CV to "${row.title}".`;
      },
    }),

    deleteTailoredCv: tool({
      description:
        'Delete a tailored CV variant and its cached PDF. Confirm with the user first.',
      inputSchema: deleteTailoredCvInputSchema,
      execute: async ({ tailoredCvId }) => {
        await deleteTailoredCv({ user, tailoredCvId });
        logger.info({ userId: user.id, tailoredCvId }, 'chat-tool deleteTailoredCv');
        if (
          options.previewing?.kind === 'tailored_cv' &&
          options.previewing.refId === tailoredCvId
        ) {
          options.onPreviewSwitch?.({ kind: 'master' });
        }
        return 'Deleted tailored CV.';
      },
    }),
  } as const;
}

export const TAILORED_TOOL_NAMES = [
  'listTailoredCvs',
  'createTailoredCv',
  'readTailoredCv',
  'rewriteTailoredSummary',
  'editTailoredExperienceBullet',
  'addTailoredExperienceBullet',
  'removeTailoredExperienceBullet',
  'editTailoredProjectBullet',
  'addTailoredProjectBullet',
  'removeTailoredProjectBullet',
  'setTailoredAccentHex',
  'setTailoredTemplate',
  'renameTailoredCv',
  'deleteTailoredCv',
] as const;
