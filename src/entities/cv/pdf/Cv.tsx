import type { Database } from '@/shared/api/supabase/types';

import { defaultLayoutForTemplate, type LayoutSpec } from './layout-spec';
import type { TemplateProps } from './templates/shared';
import { LayoutCv } from './templates/layout-executor';

export type CvTemplate = Database['public']['Enums']['cv_template'];

export function Cv({
  template = 'single-column',
  layout = null,
  ...props
}: TemplateProps & { template?: CvTemplate; layout?: LayoutSpec | null }) {
  const resolved = layout ?? defaultLayoutForTemplate(template);
  return <LayoutCv layout={resolved} {...props} />;
}
