import type { Database } from '@/libs/supabase/types';

import type { TemplateProps } from './templates/shared';
import { SingleColumnCv } from './templates/single-column';
import { TwoColumnCv } from './templates/two-column';

export type CvTemplate = Database['public']['Enums']['cv_template'];

export function Cv({ template = 'single-column', ...props }: TemplateProps & { template?: CvTemplate }) {
  if (template === 'two-column') return <TwoColumnCv {...props} />;
  return <SingleColumnCv {...props} />;
}
