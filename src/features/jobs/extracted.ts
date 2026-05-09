import type { ExtractedJd } from '@/libs/ai/types';
import { extractedJdSchema } from '@/libs/ai/types';
import type { Json } from '@/libs/supabase/types';

export function parseExtracted(value: Json | null | undefined): ExtractedJd | null {
  if (value == null) return null;
  const result = extractedJdSchema.safeParse(value);
  return result.success ? result.data : null;
}
