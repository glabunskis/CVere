import { tool } from 'ai';

import { updateProfileIdentity } from '@/features/chat/services/profile-content-service';
import { logger } from '@/libs/logger';
import type { User } from '@supabase/supabase-js';

import {
  setContactEmailInputSchema,
  setFullNameInputSchema,
  setLinksInputSchema,
  setLocationInputSchema,
  setPhoneInputSchema,
} from '../schemas';

import 'server-only';

/**
 * Identity / contact field setters. These changes affect the CV header and
 * trigger a re-render at the end of the turn. The system prompt now allows
 * the model to edit identity fields when the user asks; previously this was
 * forbidden because no tools existed.
 */
export function buildIdentityTools(user: User) {
  return {
    setFullName: tool({
      description:
        'Set the user\'s display name (shown at the top of the CV). Pass an empty string or ' +
        'null to clear.',
      inputSchema: setFullNameInputSchema,
      execute: async ({ fullName }) => {
        await updateProfileIdentity({ user, patch: { fullName } });
        logger.info({ userId: user.id }, 'chat-tool setFullName');
        return fullName && fullName.trim().length > 0
          ? `Set full name to "${fullName.trim()}".`
          : 'Cleared full name.';
      },
    }),

    setLocation: tool({
      description:
        'Set the user\'s location (e.g. "Berlin, Germany" or "Remote — UTC+1"). Pass an empty ' +
        'string or null to clear.',
      inputSchema: setLocationInputSchema,
      execute: async ({ location }) => {
        await updateProfileIdentity({ user, patch: { location } });
        logger.info({ userId: user.id }, 'chat-tool setLocation');
        return location && location.trim().length > 0
          ? `Set location to "${location.trim()}".`
          : 'Cleared location.';
      },
    }),

    setPhone: tool({
      description: 'Set the user\'s phone number. Pass an empty string or null to clear.',
      inputSchema: setPhoneInputSchema,
      execute: async ({ phone }) => {
        await updateProfileIdentity({ user, patch: { phone } });
        logger.info({ userId: user.id }, 'chat-tool setPhone');
        return phone && phone.trim().length > 0 ? 'Set phone number.' : 'Cleared phone number.';
      },
    }),

    setContactEmail: tool({
      description:
        'Set the public contact email shown on the CV. Must be a valid email address. Pass ' +
        'null to clear.',
      inputSchema: setContactEmailInputSchema,
      execute: async ({ contactEmail }) => {
        await updateProfileIdentity({ user, patch: { contactEmail } });
        logger.info({ userId: user.id }, 'chat-tool setContactEmail');
        return contactEmail ? `Set contact email to ${contactEmail}.` : 'Cleared contact email.';
      },
    }),

    setLinks: tool({
      description:
        'Set one or more of the user\'s links: LinkedIn, GitHub, personal website. Provide ' +
        'only the fields you want to change; omitted fields are left untouched. Pass null on ' +
        'a field to clear it.',
      inputSchema: setLinksInputSchema,
      execute: async ({ linkedinUrl, githubUrl, websiteUrl }) => {
        await updateProfileIdentity({
          user,
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
