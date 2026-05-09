import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { jsonToStringArray } from '@/features/profile/utils';
import type { ExtractedJd } from '@/libs/ai/types';

export type DiffEntry = {
  term: string;
  source: 'requirement' | 'stack' | 'keyword';
};

export type DiffResult = {
  matches: DiffEntry[];
  weak: DiffEntry[];
  gaps: DiffEntry[];
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function buildProfileSearchSpaces(summary: string | null, children: ProfileChildren) {
  const strong = new Set<string>();
  const weakBlobs: string[] = [];

  for (const skill of children.skill) strong.add(normalize(skill.name));
  for (const exp of children.experience) {
    for (const item of jsonToStringArray(exp.stack)) strong.add(normalize(item));
    weakBlobs.push(`${exp.company} ${exp.role} ${exp.summary ?? ''} ${jsonToStringArray(exp.bullets).join(' ')}`);
  }
  for (const project of children.project) {
    for (const item of jsonToStringArray(project.stack)) strong.add(normalize(item));
    weakBlobs.push(`${project.name} ${project.description ?? ''} ${jsonToStringArray(project.bullets).join(' ')}`);
  }
  if (summary) weakBlobs.push(summary);

  const weakBlob = weakBlobs.join(' \n ').toLowerCase();
  return { strong, weakBlob };
}

function classify(term: string, strong: Set<string>, weakBlob: string): 'match' | 'weak' | 'gap' {
  const norm = normalize(term);
  if (!norm) return 'gap';
  if (strong.has(norm)) return 'match';
  for (const candidate of strong) {
    if (candidate.includes(norm) || norm.includes(candidate)) {
      return 'match';
    }
  }
  if (weakBlob.includes(norm)) return 'weak';
  return 'gap';
}

export function buildJobDiff(extracted: ExtractedJd, summary: string | null, children: ProfileChildren): DiffResult {
  const { strong, weakBlob } = buildProfileSearchSpaces(summary, children);

  const entries: DiffEntry[] = [
    ...extracted.requirements.map((term) => ({ term, source: 'requirement' as const })),
    ...extracted.stack.map((term) => ({ term, source: 'stack' as const })),
    ...extracted.keywords.map((term) => ({ term, source: 'keyword' as const })),
  ];

  const seen = new Set<string>();
  const result: DiffResult = { matches: [], weak: [], gaps: [] };

  for (const entry of entries) {
    const key = `${entry.source}:${normalize(entry.term)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const verdict = classify(entry.term, strong, weakBlob);
    if (verdict === 'match') result.matches.push(entry);
    else if (verdict === 'weak') result.weak.push(entry);
    else result.gaps.push(entry);
  }

  return result;
}
