import type { Database } from '@/libs/supabase/types';

export type CvDateFormat = Database['public']['Enums']['cv_date_format'];

export const CV_DATE_FORMATS: { id: CvDateFormat; label: string; example: string }[] = [
  { id: 'year', label: 'Year only', example: '2024' },
  { id: 'mm_yyyy', label: 'MM/YYYY', example: '03/2024' },
  { id: 'mon_yyyy', label: 'Mon YYYY', example: 'Mar 2024' },
  { id: 'mon_d_yyyy', label: 'Mon D, YYYY', example: 'Mar 15, 2024' },
];

export const DEFAULT_CV_DATE_FORMAT: CvDateFormat = 'mm_yyyy';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Accepts a Postgres date string (YYYY-MM-DD) and returns the formatted display.
// Returns null when the input cannot be parsed.
export function formatCvDate(value: string | null | undefined, format: CvDateFormat): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  const monthName = SHORT_MONTHS[month - 1];
  switch (format) {
    case 'year':
      return String(year);
    case 'mm_yyyy':
      return `${String(month).padStart(2, '0')}/${year}`;
    case 'mon_yyyy':
      return `${monthName} ${year}`;
    case 'mon_d_yyyy':
      return `${monthName} ${day}, ${year}`;
  }
}
