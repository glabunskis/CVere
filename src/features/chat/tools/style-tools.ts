import { tool } from 'ai';

import {
  setAccentHex,
  setDateFormat,
  setTemplate,
} from '@/features/cv/services/cv-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  setAccentHexInputSchema,
  setCertificationDateFormatInputSchema,
  setEducationDateFormatInputSchema,
  setTemplateInputSchema,
} from '../schemas';

import 'server-only';

/**
 * Style tools for the chat agent. Each tool persists a single CV preferences
 * patch via the shared service. Tools never trigger a PDF render — the route
 * does that once per assistant turn after the stream finishes.
 *
 * Outputs are short human-readable strings; the model surfaces them in its
 * end-of-turn summary.
 */
export function buildStyleTools(user: User, activeCvId: string) {
  return {
    setTemplate: tool({
      description:
        'Switch the CV template. "single-column" is the standard layout; "two-column" puts ' +
        'skills, education, and certifications in a sidebar. Omit cvId to target the selected CV.',
      inputSchema: setTemplateInputSchema,
      execute: async ({ cvId, template }) => {
        const targetCvId = cvId ?? activeCvId;
        await setTemplate({ userId: user.id, cvId: targetCvId, template });
        logger.info({ userId: user.id, template }, 'chat-tool setTemplate');
        return `Set template to ${template}.`;
      },
    }),

    setAccentHex: tool({
      description:
        'Set the CV accent color. Accepts a 6-digit hex like "#0066CC". Used for headings ' +
        'and dividers. Omit cvId to target the selected CV.',
      inputSchema: setAccentHexInputSchema,
      execute: async ({ cvId, hex }) => {
        const targetCvId = cvId ?? activeCvId;
        await setAccentHex({ userId: user.id, cvId: targetCvId, accentHex: hex });
        logger.info({ userId: user.id, accentHex: hex }, 'chat-tool setAccentHex');
        return `Set accent color to ${hex}.`;
      },
    }),

    setEducationDateFormat: tool({
      description:
        'Pick how education entry dates are rendered: "year", "mm_yyyy", "mon_yyyy", or ' +
        '"mon_d_yyyy". Omit cvId to target the selected CV.',
      inputSchema: setEducationDateFormatInputSchema,
      execute: async ({ cvId, format }) => {
        const targetCvId = cvId ?? activeCvId;
        await setDateFormat({
          userId: user.id,
          cvId: targetCvId,
          section: 'education',
          format,
        });
        logger.info(
          { userId: user.id, educationDateFormat: format },
          'chat-tool setEducationDateFormat',
        );
        return `Set education date format to ${format}.`;
      },
    }),

    setCertificationDateFormat: tool({
      description:
        'Pick how certification entry dates are rendered: "year", "mm_yyyy", "mon_yyyy", or ' +
        '"mon_d_yyyy". Omit cvId to target the selected CV.',
      inputSchema: setCertificationDateFormatInputSchema,
      execute: async ({ cvId, format }) => {
        const targetCvId = cvId ?? activeCvId;
        await setDateFormat({
          userId: user.id,
          cvId: targetCvId,
          section: 'certification',
          format,
        });
        logger.info(
          { userId: user.id, certificationDateFormat: format },
          'chat-tool setCertificationDateFormat',
        );
        return `Set certification date format to ${format}.`;
      },
    }),
  } as const;
}

export const STYLE_TOOL_NAMES = [
  'setTemplate',
  'setAccentHex',
  'setEducationDateFormat',
  'setCertificationDateFormat',
] as const;
