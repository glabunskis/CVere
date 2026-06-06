import { ACHIEVEMENT_TOOL_NAMES } from './achievement-tools';
import { CONTENT_TOOL_NAMES } from './content-tools';
import { ENTRY_TOOL_NAMES } from './entry-tools';
import { IDENTITY_TOOL_NAMES } from './identity-tools';
import { SECTION_TOOL_NAMES } from './section-tools';
import { STYLE_TOOL_NAMES } from './style-tools';
import { VACANCY_TOOL_NAMES } from './vacancy-tools';

const NON_MUTATING_TOOL_NAMES = new Set<string>([
  'readProfile',
  'listVacancies',
  'readVacancy',
  'listPendingAchievements',
  'dismissAchievement',
]);

const ALL_TOOL_NAMES = [
  ...CONTENT_TOOL_NAMES,
  ...ENTRY_TOOL_NAMES,
  ...SECTION_TOOL_NAMES,
  ...IDENTITY_TOOL_NAMES,
  ...STYLE_TOOL_NAMES,
  ...ACHIEVEMENT_TOOL_NAMES,
  ...VACANCY_TOOL_NAMES,
] as const;

export const MUTATING_TOOLS: ReadonlySet<string> = new Set(
  ALL_TOOL_NAMES.filter((toolName) => !NON_MUTATING_TOOL_NAMES.has(toolName)),
);
