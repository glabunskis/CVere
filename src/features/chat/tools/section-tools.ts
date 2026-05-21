import { tool } from 'ai';

import {
  addCertification,
  addEducation,
  addLanguage,
  addSkill,
  editCertification,
  editEducation,
  editLanguage,
  editSkill,
  moveCertification,
  moveEducation,
  moveLanguage,
  moveSkill,
  removeCertification,
  removeEducation,
  removeLanguage,
  removeSkill,
} from '@/features/chat/services/profile-content-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  addCertificationInputSchema,
  addEducationInputSchema,
  addLanguageInputSchema,
  addSkillInputSchema,
  editCertificationInputSchema,
  editEducationInputSchema,
  editLanguageInputSchema,
  editSkillInputSchema,
  moveCertificationInputSchema,
  moveEducationInputSchema,
  moveLanguageInputSchema,
  moveSkillInputSchema,
  removeCertificationInputSchema,
  removeEducationInputSchema,
  removeLanguageInputSchema,
  removeSkillInputSchema,
} from '../schemas';

import 'server-only';

/**
 * Section tools for skill / education / certification / language. Each
 * section follows the same add/edit/remove/move shape; ids come from
 * `readProfile`. Position is auto-managed: `add` appends, `move` rewrites
 * positions densely. Per-section cap matches the existing 50-bullet cap.
 */
export function buildSectionTools(user: User) {
  return {
    // ---------- Skills ----------
    addSkill: tool({
      description:
        'Append a new skill to the master CV. Use `readProfile` first if the user might ' +
        'already have a similar skill to avoid duplicates.',
      inputSchema: addSkillInputSchema,
      execute: async ({ name, category, level }) => {
        const row = await addSkill({ user, payload: { name, category, level } });
        logger.info({ userId: user.id, skillId: row.id }, 'chat-tool addSkill');
        return `Added skill "${row.name}".`;
      },
    }),

    editSkill: tool({
      description: 'Edit a skill\'s name / category / level. Get the id from `readProfile`.',
      inputSchema: editSkillInputSchema,
      execute: async ({ skillId, name, category, level }) => {
        const row = await editSkill({ user, skillId, patch: { name, category, level } });
        logger.info({ userId: user.id, skillId }, 'chat-tool editSkill');
        return `Updated skill "${row.name}".`;
      },
    }),

    removeSkill: tool({
      description: 'Remove a skill from the master CV. Get the id from `readProfile`.',
      inputSchema: removeSkillInputSchema,
      execute: async ({ skillId }) => {
        await removeSkill({ user, skillId });
        logger.info({ userId: user.id, skillId }, 'chat-tool removeSkill');
        return 'Removed skill.';
      },
    }),

    moveSkill: tool({
      description:
        'Reorder a skill. `toIndex` is the new 0-based position; values past the end ' +
        'clamp to the last slot.',
      inputSchema: moveSkillInputSchema,
      execute: async ({ skillId, toIndex }) => {
        await moveSkill({ user, skillId, toIndex });
        logger.info({ userId: user.id, skillId, toIndex }, 'chat-tool moveSkill');
        return `Moved skill to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Education ----------
    addEducation: tool({
      description: 'Append a new education entry to the master CV.',
      inputSchema: addEducationInputSchema,
      execute: async ({ institution, degree, field, startDate, endDate, summary }) => {
        const row = await addEducation({
          user,
          payload: { institution, degree, field, startDate, endDate, summary },
        });
        logger.info({ userId: user.id, educationId: row.id }, 'chat-tool addEducation');
        return `Added education at ${row.institution}.`;
      },
    }),

    editEducation: tool({
      description:
        'Edit an education entry. Provide only the fields you want to change; the rest ' +
        'are left untouched. Get the id from `readProfile`.',
      inputSchema: editEducationInputSchema,
      execute: async ({ educationId, institution, degree, field, startDate, endDate, summary }) => {
        const row = await editEducation({
          user,
          educationId,
          patch: { institution, degree, field, startDate, endDate, summary },
        });
        logger.info({ userId: user.id, educationId }, 'chat-tool editEducation');
        return `Updated education at ${row.institution}.`;
      },
    }),

    removeEducation: tool({
      description: 'Remove an education entry. Get the id from `readProfile`.',
      inputSchema: removeEducationInputSchema,
      execute: async ({ educationId }) => {
        await removeEducation({ user, educationId });
        logger.info({ userId: user.id, educationId }, 'chat-tool removeEducation');
        return 'Removed education entry.';
      },
    }),

    moveEducation: tool({
      description: 'Reorder an education entry. `toIndex` is the new 0-based position.',
      inputSchema: moveEducationInputSchema,
      execute: async ({ educationId, toIndex }) => {
        await moveEducation({ user, educationId, toIndex });
        logger.info({ userId: user.id, educationId, toIndex }, 'chat-tool moveEducation');
        return `Moved education entry to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Certifications ----------
    addCertification: tool({
      description: 'Append a new certification to the master CV.',
      inputSchema: addCertificationInputSchema,
      execute: async ({ name, issuer, issuedAt, expiresAt, link }) => {
        const row = await addCertification({
          user,
          payload: { name, issuer, issuedAt, expiresAt, link },
        });
        logger.info({ userId: user.id, certificationId: row.id }, 'chat-tool addCertification');
        return `Added certification "${row.name}".`;
      },
    }),

    editCertification: tool({
      description:
        'Edit a certification. Provide only the fields you want to change. Get the id ' +
        'from `readProfile`.',
      inputSchema: editCertificationInputSchema,
      execute: async ({ certificationId, name, issuer, issuedAt, expiresAt, link }) => {
        const row = await editCertification({
          user,
          certificationId,
          patch: { name, issuer, issuedAt, expiresAt, link },
        });
        logger.info(
          { userId: user.id, certificationId },
          'chat-tool editCertification',
        );
        return `Updated certification "${row.name}".`;
      },
    }),

    removeCertification: tool({
      description: 'Remove a certification. Get the id from `readProfile`.',
      inputSchema: removeCertificationInputSchema,
      execute: async ({ certificationId }) => {
        await removeCertification({ user, certificationId });
        logger.info({ userId: user.id, certificationId }, 'chat-tool removeCertification');
        return 'Removed certification.';
      },
    }),

    moveCertification: tool({
      description: 'Reorder a certification. `toIndex` is the new 0-based position.',
      inputSchema: moveCertificationInputSchema,
      execute: async ({ certificationId, toIndex }) => {
        await moveCertification({ user, certificationId, toIndex });
        logger.info(
          { userId: user.id, certificationId, toIndex },
          'chat-tool moveCertification',
        );
        return `Moved certification to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Languages ----------
    addLanguage: tool({
      description: 'Append a new language to the master CV.',
      inputSchema: addLanguageInputSchema,
      execute: async ({ name, proficiency }) => {
        const row = await addLanguage({ user, payload: { name, proficiency } });
        logger.info({ userId: user.id, languageId: row.id }, 'chat-tool addLanguage');
        return `Added language "${row.name}".`;
      },
    }),

    editLanguage: tool({
      description:
        'Edit a language. Provide only the fields you want to change. Get the id from ' +
        '`readProfile`.',
      inputSchema: editLanguageInputSchema,
      execute: async ({ languageId, name, proficiency }) => {
        const row = await editLanguage({
          user,
          languageId,
          patch: { name, proficiency },
        });
        logger.info({ userId: user.id, languageId }, 'chat-tool editLanguage');
        return `Updated language "${row.name}".`;
      },
    }),

    removeLanguage: tool({
      description: 'Remove a language. Get the id from `readProfile`.',
      inputSchema: removeLanguageInputSchema,
      execute: async ({ languageId }) => {
        await removeLanguage({ user, languageId });
        logger.info({ userId: user.id, languageId }, 'chat-tool removeLanguage');
        return 'Removed language.';
      },
    }),

    moveLanguage: tool({
      description: 'Reorder a language. `toIndex` is the new 0-based position.',
      inputSchema: moveLanguageInputSchema,
      execute: async ({ languageId, toIndex }) => {
        await moveLanguage({ user, languageId, toIndex });
        logger.info({ userId: user.id, languageId, toIndex }, 'chat-tool moveLanguage');
        return `Moved language to position ${toIndex + 1}.`;
      },
    }),
  } as const;
}

export const SECTION_TOOL_NAMES = [
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
] as const;
