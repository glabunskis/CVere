import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getAiProviderKind } from '@/libs/ai';

export function StubbedAiBadge() {
  const kind = getAiProviderKind();
  if (kind === 'openai') return null;

  return (
    <Badge variant='warning' title='AI calls return deterministic stub data. Set AI_PROVIDER=openai to wire a real model.'>
      <Sparkles />
      Stubbed AI
    </Badge>
  );
}
