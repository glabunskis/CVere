import type { Json } from '@/shared/api/supabase/types';

export function jsonToStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
