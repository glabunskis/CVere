import { z } from 'zod';

import { aiProfileSchema, tailoredSectionsSchema } from '@/libs/ai/types';

export const tailorCvSchema = z.object({
  jobDescriptionId: z.string().uuid(),
});
export type TailorCvInput = z.infer<typeof tailorCvSchema>;

export const updateTailoredSectionsSchema = z.object({
  id: z.string().uuid(),
  summary: z.string().max(2000).nullable().optional(),
  sections: tailoredSectionsSchema.shape.sections,
});

export const setTailoredStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'final']),
});

export const deleteTailoredSchema = z.object({
  id: z.string().uuid(),
});

export const profileSnapshotSchema = aiProfileSchema;

export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;
