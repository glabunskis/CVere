import { tool } from 'ai';

import {
  dismissAchievementById,
  integrateAchievementById,
  listPendingAchievementRows,
} from '@/features/achievements/services/achievement-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  dismissAchievementInputSchema,
  integrateAchievementInputSchema,
  listPendingAchievementsInputSchema,
} from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

const MAX_LIST_PREVIEW = 240;

/**
 * Achievement integration tools. The chat agent can surface the pending
 * inbox, integrate a chosen entry into a section, or dismiss it. The system
 * prompt requires an explicit user confirmation before `integrateAchievement`
 * runs — the tool itself just persists.
 */
export function buildAchievementTools(user: User, activeCv: ActiveCvRef) {
  return {
    listPendingAchievements: tool({
      description:
        'List the user\'s pending (un-integrated, non-dismissed) achievement entries. Returns ' +
        'id, short preview, suggested target section (if set), and createdAt for each.',
      inputSchema: listPendingAchievementsInputSchema,
      execute: async () => {
        const rows = await listPendingAchievementRows({ user });
        logger.info(
          { userId: user.id, count: rows.length },
          'chat-tool listPendingAchievements',
        );
        return rows.map((row) => ({
          id: row.id,
          preview: previewText(row.normalized_text ?? row.raw_text),
          suggestedSection: row.target_section,
          createdAt: row.created_at,
        }));
      },
    }),

    integrateAchievement: tool({
      description:
        'Apply a pending achievement to a CV section. Only call this AFTER the user has ' +
        'explicitly confirmed both the achievement id and the target section. Allowed sections: ' +
        '"summary", "project", "skill", "certification", "language". (For "experience" or "education" ' +
        'sections, do not use this tool; instead, use addExperience/addEducation and then call dismissAchievement). ' +
        'Omit cvId to target the selected CV.',
      inputSchema: integrateAchievementInputSchema,
      execute: async ({ cvId, achievementId, targetSection }) => {
        const targetCvId = cvId ?? activeCv.current;
        const result = await integrateAchievementById({
          user,
          cvId: targetCvId,
          achievementId,
          targetSectionOverride: targetSection,
        });
        logger.info(
          { userId: user.id, achievementId, targetSection, already: result.alreadyIntegrated },
          'chat-tool integrateAchievement',
        );
        if (result.alreadyIntegrated) {
          return `Achievement was already integrated into ${result.targetSection}.`;
        }
        return `Integrated achievement into ${result.targetSection}.`;
      },
    }),

    dismissAchievement: tool({
      description:
        'Dismiss a pending achievement so it no longer shows up in the inbox. Use this when ' +
        'the user explicitly declines to integrate one.',
      inputSchema: dismissAchievementInputSchema,
      execute: async ({ achievementId }) => {
        const { alreadyDismissed } = await dismissAchievementById({
          user,
          achievementId,
        });
        logger.info(
          { userId: user.id, achievementId, alreadyDismissed },
          'chat-tool dismissAchievement',
        );
        return alreadyDismissed ? 'Achievement was already dismissed.' : 'Dismissed achievement.';
      },
    }),
  } as const;
}

function previewText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_LIST_PREVIEW) return trimmed;
  return `${trimmed.slice(0, MAX_LIST_PREVIEW - 3).trimEnd()}...`;
}

export const ACHIEVEMENT_TOOL_NAMES = [
  'listPendingAchievements',
  'integrateAchievement',
  'dismissAchievement',
] as const;
