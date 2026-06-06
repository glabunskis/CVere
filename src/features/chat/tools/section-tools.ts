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
} from '@/features/cv/services/cv-service';
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

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Section tools for skill / education / certification / language. Each
 * section follows the same add/edit/remove/move shape; ids come from
 * `readProfile`. Position is auto-managed: `add` appends, `move` rewrites
 * positions densely. Per-section cap matches the existing 50-bullet cap.
 */
export function buildSectionTools(user: User, activeCv: ActiveCvRef) {
  return {
    // ---------- Skills ----------
    addSkill: tool({
      description:
        'Append a new skill. Call `readProfile` first if the user might already have a ' +
        'similar skill, to avoid duplicates. Omit cvId to target the selected CV.',
      inputSchema: addSkillInputSchema,
      execute: async ({ cvId, name, category, level }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addSkill({ user, cvId: targetCvId, payload: { name, category, level } });
        logger.info({ userId: user.id, skillId: row.id }, 'chat-tool addSkill');
        return `Added skill "${row.name}".`;
      },
    }),

    editSkill: tool({
      description:
        'Edit a skill\'s name / category / level. Get the id from `readProfile`. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: editSkillInputSchema,
      execute: async ({ cvId, skillId, name, category, level }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editSkill({
          user,
          cvId: targetCvId,
          skillId,
          patch: { name, category, level },
        });
        logger.info({ userId: user.id, skillId }, 'chat-tool editSkill');
        return `Updated skill "${row.name}".`;
      },
    }),

    removeSkill: tool({
      description:
        'Remove a skill. Get the id from `readProfile`. Omit cvId to target the selected CV.',
      inputSchema: removeSkillInputSchema,
      execute: async ({ cvId, skillId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeSkill({ user, cvId: targetCvId, skillId });
        logger.info({ userId: user.id, skillId }, 'chat-tool removeSkill');
        return 'Removed skill.';
      },
    }),

    moveSkill: tool({
      description:
        'Reorder a skill. `toIndex` is the new 0-based position; values past the end ' +
        'clamp to the last slot. Omit cvId to target the selected CV.',
      inputSchema: moveSkillInputSchema,
      execute: async ({ cvId, skillId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveSkill({ user, cvId: targetCvId, skillId, toIndex });
        logger.info({ userId: user.id, skillId, toIndex }, 'chat-tool moveSkill');
        return `Moved skill to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Education ----------
    addEducation: tool({
      description: 'Append a new education entry. Omit cvId to target the selected CV.',
      inputSchema: addEducationInputSchema,
      execute: async ({ cvId, institution, degree, field, startDate, endDate, summary }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addEducation({
          user,
          cvId: targetCvId,
          payload: { institution, degree, field, startDate, endDate, summary },
        });
        logger.info({ userId: user.id, educationId: row.id }, 'chat-tool addEducation');
        return `Added education at ${row.institution}.`;
      },
    }),

    editEducation: tool({
      description:
        'Edit an education entry. Provide only the fields you want to change; the rest ' +
        'are left untouched. Get the id from `readProfile`. Omit cvId to target the selected CV.',
      inputSchema: editEducationInputSchema,
      execute: async ({ cvId, educationId, institution, degree, field, startDate, endDate, summary }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editEducation({
          user,
          cvId: targetCvId,
          educationId,
          patch: { institution, degree, field, startDate, endDate, summary },
        });
        logger.info({ userId: user.id, educationId }, 'chat-tool editEducation');
        return `Updated education at ${row.institution}.`;
      },
    }),

    removeEducation: tool({
      description:
        'Remove an education entry. Get the id from `readProfile`. Omit cvId to target the ' +
        'selected CV.',
      inputSchema: removeEducationInputSchema,
      execute: async ({ cvId, educationId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeEducation({ user, cvId: targetCvId, educationId });
        logger.info({ userId: user.id, educationId }, 'chat-tool removeEducation');
        return 'Removed education entry.';
      },
    }),

    moveEducation: tool({
      description:
        'Reorder an education entry. `toIndex` is the new 0-based position. Omit cvId to ' +
        'target the selected CV.',
      inputSchema: moveEducationInputSchema,
      execute: async ({ cvId, educationId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveEducation({ user, cvId: targetCvId, educationId, toIndex });
        logger.info({ userId: user.id, educationId, toIndex }, 'chat-tool moveEducation');
        return `Moved education entry to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Certifications ----------
    addCertification: tool({
      description: 'Append a new certification. Omit cvId to target the selected CV.',
      inputSchema: addCertificationInputSchema,
      execute: async ({ cvId, name, issuer, issuedAt, expiresAt, link }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addCertification({
          user,
          cvId: targetCvId,
          payload: { name, issuer, issuedAt, expiresAt, link },
        });
        logger.info({ userId: user.id, certificationId: row.id }, 'chat-tool addCertification');
        return `Added certification "${row.name}".`;
      },
    }),

    editCertification: tool({
      description:
        'Edit a certification. Provide only the fields you want to change. Get the id ' +
        'from `readProfile`. Omit cvId to target the selected CV.',
      inputSchema: editCertificationInputSchema,
      execute: async ({ cvId, certificationId, name, issuer, issuedAt, expiresAt, link }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editCertification({
          user,
          cvId: targetCvId,
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
      description:
        'Remove a certification. Get the id from `readProfile`. Omit cvId to target the ' +
        'selected CV.',
      inputSchema: removeCertificationInputSchema,
      execute: async ({ cvId, certificationId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeCertification({ user, cvId: targetCvId, certificationId });
        logger.info({ userId: user.id, certificationId }, 'chat-tool removeCertification');
        return 'Removed certification.';
      },
    }),

    moveCertification: tool({
      description:
        'Reorder a certification. `toIndex` is the new 0-based position. Omit cvId to target ' +
        'the selected CV.',
      inputSchema: moveCertificationInputSchema,
      execute: async ({ cvId, certificationId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveCertification({ user, cvId: targetCvId, certificationId, toIndex });
        logger.info(
          { userId: user.id, certificationId, toIndex },
          'chat-tool moveCertification',
        );
        return `Moved certification to position ${toIndex + 1}.`;
      },
    }),

    // ---------- Languages ----------
    addLanguage: tool({
      description: 'Append a new language. Omit cvId to target the selected CV.',
      inputSchema: addLanguageInputSchema,
      execute: async ({ cvId, name, proficiency }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await addLanguage({ user, cvId: targetCvId, payload: { name, proficiency } });
        logger.info({ userId: user.id, languageId: row.id }, 'chat-tool addLanguage');
        return `Added language "${row.name}".`;
      },
    }),

    editLanguage: tool({
      description:
        'Edit a language. Provide only the fields you want to change. Get the id from ' +
        '`readProfile`. Omit cvId to target the selected CV.',
      inputSchema: editLanguageInputSchema,
      execute: async ({ cvId, languageId, name, proficiency }) => {
        const targetCvId = cvId ?? activeCv.current;
        const row = await editLanguage({
          user,
          cvId: targetCvId,
          languageId,
          patch: { name, proficiency },
        });
        logger.info({ userId: user.id, languageId }, 'chat-tool editLanguage');
        return `Updated language "${row.name}".`;
      },
    }),

    removeLanguage: tool({
      description:
        'Remove a language. Get the id from `readProfile`. Omit cvId to target the selected CV.',
      inputSchema: removeLanguageInputSchema,
      execute: async ({ cvId, languageId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await removeLanguage({ user, cvId: targetCvId, languageId });
        logger.info({ userId: user.id, languageId }, 'chat-tool removeLanguage');
        return 'Removed language.';
      },
    }),

    moveLanguage: tool({
      description:
        'Reorder a language. `toIndex` is the new 0-based position. Omit cvId to target the ' +
        'selected CV.',
      inputSchema: moveLanguageInputSchema,
      execute: async ({ cvId, languageId, toIndex }) => {
        const targetCvId = cvId ?? activeCv.current;
        await moveLanguage({ user, cvId: targetCvId, languageId, toIndex });
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
