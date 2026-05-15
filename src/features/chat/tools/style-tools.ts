import { tool } from 'ai';

import { applyCvPreferencesPatch } from '@/features/chat/services/cv-preferences-service';
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
export function buildStyleTools(user: User) {
  return {
    setTemplate: tool({
      description:
        'Switch the master CV template. "single-column" is the standard layout. ' +
        '"two-column" puts skills, education, and certifications in a sidebar.',
      inputSchema: setTemplateInputSchema,
      execute: async ({ template }) => {
        await applyCvPreferencesPatch(user, { template });
        logger.info({ userId: user.id, template }, 'chat-tool setTemplate');
        return `Set template to ${template}.`;
      },
    }),

    setAccentHex: tool({
      description:
        'Set the master CV accent color. Accepts a 6-digit hex like "#0066CC". ' +
        'Used for headings and dividers.',
      inputSchema: setAccentHexInputSchema,
      execute: async ({ hex }) => {
        await applyCvPreferencesPatch(user, { accentHex: hex });
        logger.info({ userId: user.id, accentHex: hex }, 'chat-tool setAccentHex');
        return `Set accent color to ${hex}.`;
      },
    }),

    setEducationDateFormat: tool({
      description:
        'Pick how education entry dates are rendered: "year", "mm_yyyy", ' +
        '"mon_yyyy", or "mon_d_yyyy".',
      inputSchema: setEducationDateFormatInputSchema,
      execute: async ({ format }) => {
        await applyCvPreferencesPatch(user, { educationDateFormat: format });
        logger.info(
          { userId: user.id, educationDateFormat: format },
          'chat-tool setEducationDateFormat',
        );
        return `Set education date format to ${format}.`;
      },
    }),

    setCertificationDateFormat: tool({
      description:
        'Pick how certification entry dates are rendered: "year", "mm_yyyy", ' +
        '"mon_yyyy", or "mon_d_yyyy".',
      inputSchema: setCertificationDateFormatInputSchema,
      execute: async ({ format }) => {
        await applyCvPreferencesPatch(user, { certificationDateFormat: format });
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
