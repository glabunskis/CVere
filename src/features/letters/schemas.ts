import { z } from 'zod';

export const generateCoverLetterSchema = z.object({
  jobDescriptionId: z.string().uuid(),
});

export const updateCoverLetterSchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(1).max(10_000),
});

export const deleteCoverLetterSchema = z.object({
  id: z.string().uuid(),
});
