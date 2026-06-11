'use server';

import { revalidatePath } from 'next/cache';

import {
  getSelectedCv,
  renderAndUploadCv,
  setAccentHex,
  setDateFormat,
  setTemplate,
} from '@/entities/cv';
import { authActionClient } from '@/shared/lib/safe-action';

import { updateCvStyleSchema } from './schemas';

export const updateCvStyle = authActionClient
  .inputSchema(updateCvStyleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const selectedCv = await getSelectedCv(ctx.user.id);
    if (parsedInput.template) {
      await setTemplate({
        userId: ctx.user.id,
        cvId: selectedCv.id,
        template: parsedInput.template,
      });
    }
    if (parsedInput.accentHex) {
      await setAccentHex({
        userId: ctx.user.id,
        cvId: selectedCv.id,
        accentHex: parsedInput.accentHex,
      });
    }
    if (parsedInput.educationDateFormat) {
      await setDateFormat({
        userId: ctx.user.id,
        cvId: selectedCv.id,
        section: 'education',
        format: parsedInput.educationDateFormat,
      });
    }
    if (parsedInput.certificationDateFormat) {
      await setDateFormat({
        userId: ctx.user.id,
        cvId: selectedCv.id,
        section: 'certification',
        format: parsedInput.certificationDateFormat,
      });
    }

    await renderAndUploadCv({ user: ctx.user, cvId: selectedCv.id });

    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const };
  });
