import type { Database } from '@/shared/api/supabase/types';

import { LayoutCv } from './templates/layout-executor';
import type { TemplateProps } from './templates/shared';
import { defaultLayoutForTemplate, type LayoutSpec } from './layout-spec';

export type CvTemplate = Database['public']['Enums']['cv_template'];

export function Cv({
  template = 'single-column',
  layout = null,
  ...props
}: TemplateProps & { template?: CvTemplate; layout?: LayoutSpec | null }) {
  const resolved = layout ?? defaultLayoutForTemplate(template);
  return <LayoutCv layout={resolved} {...props} />;
}
