import { TOOL_REGISTRY } from './tool-registry';

import 'server-only';

export const MUTATING_TOOLS: ReadonlySet<string> = new Set(
  TOOL_REGISTRY.filter((t) => t.mutates).map((t) => t.name),
);
