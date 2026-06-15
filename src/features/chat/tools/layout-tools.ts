import { tool } from 'ai';

import { clearLayout, setLayout } from '@/entities/cv';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import { resetLayoutInputSchema, setLayoutInputSchema } from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Layout tools: the model emits a structured LayoutSpec which is persisted to
 * cv.layout_json and rendered by the deterministic executor. Tools never render
 * the PDF — the route does that once per assistant turn.
 */
export function buildLayoutTools(user: User, activeCv: ActiveCvRef) {
  return {
    setLayout: tool({
      description:
        'Set an AI-designed page layout for the CV: section order, single vs two ' +
        'columns, and density. Use when the user asks to lay out, restructure, make ' +
        'denser, or make multi-column. Reason about good CV layout from the content ' +
        'volume. This overrides any manual template choice. Omit cvId for the selected CV.',
      inputSchema: setLayoutInputSchema,
      execute: async ({ cvId, layout }) => {
        const targetCvId = cvId ?? activeCv.current;
        await setLayout({ userId: user.id, cvId: targetCvId, layoutJson: layout });
        logger.info({ userId: user.id, columns: layout.columns, density: layout.density }, 'chat-tool setLayout');
        return `Applied a ${layout.columns}-column ${layout.density} layout.`;
      },
    }),

    resetLayout: tool({
      description:
        'Remove the AI layout and revert the CV to its standard template (single-column ' +
        'or two-column). Use when the user wants the default layout back. Omit cvId for ' +
        'the selected CV.',
      inputSchema: resetLayoutInputSchema,
      execute: async ({ cvId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await clearLayout({ userId: user.id, cvId: targetCvId });
        logger.info({ userId: user.id }, 'chat-tool resetLayout');
        return 'Reset to the standard template layout.';
      },
    }),
  } as const;
}

export const LAYOUT_TOOL_NAMES = ['setLayout', 'resetLayout'] as const;
