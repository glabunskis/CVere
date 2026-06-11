import { tool } from 'ai';

import { updateProfileIdentity } from '@/entities/cv';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import {
  setContactEmailInputSchema,
  setFullNameInputSchema,
  setLinksInputSchema,
  setLocationInputSchema,
  setPhoneInputSchema,
} from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Identity / contact field setters. These changes affect the CV header and
 * trigger a re-render at the end of the turn. The system prompt now allows
 * the model to edit identity fields when the user asks; previously this was
 * forbidden because no tools existed.
 */
export function buildIdentityTools(user: User, activeCv: ActiveCvRef) {
  return {
    setFullName: tool({
      description:
        'Set the display name shown at the top of the CV. Pass an empty string or null to ' +
        'clear. Omit cvId to target the selected CV.',
      inputSchema: setFullNameInputSchema,
      execute: async ({ cvId, fullName }) => {
        const targetCvId = cvId ?? activeCv.current;
        await updateProfileIdentity({ user, cvId: targetCvId, patch: { fullName } });
        logger.info({ userId: user.id }, 'chat-tool setFullName');
        return fullName && fullName.trim().length > 0
          ? `Set full name to "${fullName.trim()}".`
          : 'Cleared full name.';
      },
    }),

    setLocation: tool({
      description:
        'Set the location shown on the CV (e.g. "Berlin, Germany" or "Remote — UTC+1"). Pass ' +
        'an empty string or null to clear. Omit cvId to target the selected CV.',
      inputSchema: setLocationInputSchema,
      execute: async ({ cvId, location }) => {
        const targetCvId = cvId ?? activeCv.current;
        await updateProfileIdentity({ user, cvId: targetCvId, patch: { location } });
        logger.info({ userId: user.id }, 'chat-tool setLocation');
        return location && location.trim().length > 0
          ? `Set location to "${location.trim()}".`
          : 'Cleared location.';
      },
    }),

    setPhone: tool({
      description:
        'Set the phone number shown on the CV. Pass an empty string or null to clear. ' +
        'Omit cvId to target the selected CV.',
      inputSchema: setPhoneInputSchema,
      execute: async ({ cvId, phone }) => {
        const targetCvId = cvId ?? activeCv.current;
        await updateProfileIdentity({ user, cvId: targetCvId, patch: { phone } });
        logger.info({ userId: user.id }, 'chat-tool setPhone');
        return phone && phone.trim().length > 0 ? 'Set phone number.' : 'Cleared phone number.';
      },
    }),

    setContactEmail: tool({
      description:
        'Set the public contact email shown on the CV. Must be a valid email address. Pass ' +
        'null to clear. Omit cvId to target the selected CV.',
      inputSchema: setContactEmailInputSchema,
      execute: async ({ cvId, contactEmail }) => {
        const targetCvId = cvId ?? activeCv.current;
        await updateProfileIdentity({ user, cvId: targetCvId, patch: { contactEmail } });
        logger.info({ userId: user.id }, 'chat-tool setContactEmail');
        return contactEmail ? `Set contact email to ${contactEmail}.` : 'Cleared contact email.';
      },
    }),

    setLinks: tool({
      description:
        'Set one or more CV links: LinkedIn, GitHub, personal website. Provide only the fields ' +
        'you want to change; omitted fields are left untouched. Pass null on a field to clear ' +
        'it. Omit cvId to target the selected CV.',
      inputSchema: setLinksInputSchema,
      execute: async ({ cvId, linkedinUrl, githubUrl, websiteUrl }) => {
        const targetCvId = cvId ?? activeCv.current;
        await updateProfileIdentity({
          user,
          cvId: targetCvId,
          patch: { linkedinUrl, githubUrl, websiteUrl },
        });
        const changed: string[] = [];
        if (linkedinUrl !== undefined) changed.push('LinkedIn');
        if (githubUrl !== undefined) changed.push('GitHub');
        if (websiteUrl !== undefined) changed.push('website');
        logger.info({ userId: user.id, fields: changed }, 'chat-tool setLinks');
        return `Updated links: ${changed.join(', ')}.`;
      },
    }),
  } as const;
}

export const IDENTITY_TOOL_NAMES = [
  'setFullName',
  'setLocation',
  'setPhone',
  'setContactEmail',
  'setLinks',
] as const;
