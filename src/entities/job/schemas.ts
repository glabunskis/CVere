import { z } from 'zod';

export const ingestJobDescriptionSchema = z.object({
  rawText: z.string().min(20, 'Paste a longer JD').max(20_000),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
});
export type IngestJobDescriptionInput = z.infer<typeof ingestJobDescriptionSchema>;

export const deleteJobDescriptionSchema = z.object({
  id: z.string().uuid(),
});
