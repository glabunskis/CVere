import { tool } from 'ai';

import {
  clearFontSizes,
  setAccentHex,
  setDateFormat,
  setFontSizes,
  setTemplate,
} from '@/entities/cv';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import {
  resetFontSizesInputSchema,
  setAccentHexInputSchema,
  setCertificationDateFormatInputSchema,
  setEducationDateFormatInputSchema,
  setExperienceDateFormatInputSchema,
  setFontSizesInputSchema,
  setTemplateInputSchema,
} from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Style tools for the chat agent. Each tool persists a single CV preferences
 * patch via the shared service. Tools never trigger a PDF render — the route
 * does that once per assistant turn after the stream finishes.
 *
 * Outputs are short human-readable strings; the model surfaces them in its
 * end-of-turn summary.
 */
export function buildStyleTools(user: User, activeCv: ActiveCvRef) {
  return {
    setTemplate: tool({
      description:
        'Switch the CV template. "single-column" is the standard layout; "two-column" puts ' +
        'skills, education, and certifications in a sidebar. Omit cvId to target the selected CV.',
      inputSchema: setTemplateInputSchema,
      execute: async ({ cvId, template }) => {
        const targetCvId = cvId ?? activeCv.current;
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
        const targetCvId = cvId ?? activeCv.current;
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
        const targetCvId = cvId ?? activeCv.current;
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
        const targetCvId = cvId ?? activeCv.current;
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

    setExperienceDateFormat: tool({
      description:
        'Pick how experience entry dates are rendered: "year", "mm_yyyy", "mon_yyyy", or ' +
        '"mon_d_yyyy". Omit cvId to target the selected CV.',
      inputSchema: setExperienceDateFormatInputSchema,
      execute: async ({ cvId, format }) => {
        const targetCvId = cvId ?? activeCv.current;
        await setDateFormat({
          userId: user.id,
          cvId: targetCvId,
          section: 'experience',
          format,
        });
        logger.info(
          { userId: user.id, experienceDateFormat: format },
          'chat-tool setExperienceDateFormat',
        );
        return `Set experience date format to ${format}.`;
      },
    }),

    setFontSizes: tool({
      description:
        'Set the font size (in points) of individual CV elements: "header" (the name), ' +
        '"sectionTitle" (section headings), and "body" (main text). Pass only the ' +
        'elements you want to change; others keep their current size. Use when the user ' +
        'asks to make text bigger/smaller for a specific part. Omit cvId to target the ' +
        'selected CV.',
      inputSchema: setFontSizesInputSchema,
      execute: async ({ cvId, fontSizes }) => {
        const targetCvId = cvId ?? activeCv.current;
        await setFontSizes({ userId: user.id, cvId: targetCvId, fontSizes });
        logger.info({ userId: user.id, fontSizes }, 'chat-tool setFontSizes');
        const parts = [
          fontSizes.header != null ? `header ${fontSizes.header}pt` : null,
          fontSizes.sectionTitle != null ? `section titles ${fontSizes.sectionTitle}pt` : null,
          fontSizes.body != null ? `body ${fontSizes.body}pt` : null,
        ].filter(Boolean);
        return `Set font sizes: ${parts.join(', ')}.`;
      },
    }),

    resetFontSizes: tool({
      description:
        'Remove all font size overrides and revert every element to its default size. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: resetFontSizesInputSchema,
      execute: async ({ cvId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await clearFontSizes({ userId: user.id, cvId: targetCvId });
        logger.info({ userId: user.id }, 'chat-tool resetFontSizes');
        return 'Reset font sizes to defaults.';
      },
    }),
  } as const;
}

export const STYLE_TOOL_NAMES = [
  'setTemplate',
  'setAccentHex',
  'setEducationDateFormat',
  'setCertificationDateFormat',
  'setExperienceDateFormat',
  'setFontSizes',
  'resetFontSizes',
] as const;
