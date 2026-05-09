import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getAiProviderKind } from '@/libs/ai';

export function StubbedAiBadge() {
  const kind = getAiProviderKind();
  if (kind === 'azure') return null;

  return (
    <Badge variant='warning' title='AI calls return deterministic stub data. Set AI_PROVIDER=azure to wire a real model.'>
      <Sparkles />
      Stubbed AI
    </Badge>
  );
}
