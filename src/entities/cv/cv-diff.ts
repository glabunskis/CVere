import type { AiProfile } from '@/entities/cv/cv-snapshot';

/**
 * Reversible structured diff between two CV snapshots ({@link AiProfile}).
 *
 * A diff records the transition `before -> after`. It is fully invertible:
 * applying it `forward` to `before` yields `after`; applying it `inverse` to
 * `after` yields `before`. Diffs are JSON-serializable so they persist in the
 * `cv_version.diff` jsonb column.
 */

export type SectionKey = 'experience' | 'projects' | 'skills' | 'education' | 'certifications' | 'languages';

const SECTION_KEYS: SectionKey[] = [
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'languages',
];

type IdentityDiff = AiProfile['identity'];
type StyleDiff = AiProfile['style'];
type LayoutDiff = AiProfile['layout'];

type SectionRow = { id: string } & Record<string, unknown>;

export type ScalarDiff<T> = { from: T; to: T };

export type SectionDiff = {
  added: SectionRow[];
  removed: SectionRow[];
  changed: { id: string; from: SectionRow; to: SectionRow }[];
  orderBefore: string[];
  orderAfter: string[];
};

export type CvDiff = {
  scalars: {
    title?: ScalarDiff<string>;
    summary?: ScalarDiff<string | null | undefined>;
    identity?: ScalarDiff<IdentityDiff>;
    style?: ScalarDiff<StyleDiff>;
    layout?: ScalarDiff<LayoutDiff>;
  };
  sections: Partial<Record<SectionKey, SectionDiff>>;
};

export type ApplyDirection = 'forward' | 'inverse';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    // Treat null/undefined as equivalent absence.
    return a == null && b == null;
  }
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of keys) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getSection(profile: AiProfile, key: SectionKey): SectionRow[] {
  return (profile[key] as unknown as SectionRow[]) ?? [];
}

function diffSection(before: SectionRow[], after: SectionRow[]): SectionDiff | null {
  const beforeById = new Map(before.map((row) => [row.id, row]));
  const afterById = new Map(after.map((row) => [row.id, row]));

  const added: SectionRow[] = [];
  const removed: SectionRow[] = [];
  const changed: { id: string; from: SectionRow; to: SectionRow }[] = [];

  for (const row of after) {
    if (!beforeById.has(row.id)) added.push(clone(row));
  }
  for (const row of before) {
    if (!afterById.has(row.id)) removed.push(clone(row));
  }
  for (const row of after) {
    const prev = beforeById.get(row.id);
    if (prev && !deepEqual(prev, row)) {
      changed.push({ id: row.id, from: clone(prev), to: clone(row) });
    }
  }

  const orderBefore = before.map((row) => row.id);
  const orderAfter = after.map((row) => row.id);
  const orderChanged = !deepEqual(orderBefore, orderAfter);

  if (added.length === 0 && removed.length === 0 && changed.length === 0 && !orderChanged) {
    return null;
  }

  return { added, removed, changed, orderBefore, orderAfter };
}

export function computeCvDiff(before: AiProfile, after: AiProfile): CvDiff {
  const scalars: CvDiff['scalars'] = {};
  if (before.title !== after.title) {
    scalars.title = { from: before.title, to: after.title };
  }
  if (!deepEqual(before.summary ?? null, after.summary ?? null)) {
    scalars.summary = { from: before.summary ?? null, to: after.summary ?? null };
  }
  if (!deepEqual(before.identity, after.identity)) {
    scalars.identity = { from: clone(before.identity), to: clone(after.identity) };
  }
  if (!deepEqual(before.style, after.style)) {
    scalars.style = { from: clone(before.style), to: clone(after.style) };
  }
  if (!deepEqual(before.layout ?? null, after.layout ?? null)) {
    scalars.layout = { from: clone(before.layout ?? null), to: clone(after.layout ?? null) };
  }

  const sections: CvDiff['sections'] = {};
  for (const key of SECTION_KEYS) {
    const sectionDiff = diffSection(getSection(before, key), getSection(after, key));
    if (sectionDiff) sections[key] = sectionDiff;
  }

  return { scalars, sections };
}

export function isEmptyCvDiff(diff: CvDiff): boolean {
  return Object.keys(diff.scalars).length === 0 && Object.keys(diff.sections).length === 0;
}

function applySection(
  current: SectionRow[],
  diff: SectionDiff,
  direction: ApplyDirection,
): SectionRow[] {
  const currentById = new Map(current.map((row) => [row.id, row]));

  if (direction === 'forward') {
    const addedById = new Map(diff.added.map((row) => [row.id, row]));
    const changedToById = new Map(diff.changed.map((entry) => [entry.id, entry.to]));
    return diff.orderAfter
      .map((id) => addedById.get(id) ?? changedToById.get(id) ?? currentById.get(id))
      .filter((row): row is SectionRow => row != null)
      .map(clone);
  }

  // inverse: reconstruct the "before" state.
  const removedById = new Map(diff.removed.map((row) => [row.id, row]));
  const changedFromById = new Map(diff.changed.map((entry) => [entry.id, entry.from]));
  return diff.orderBefore
    .map((id) => removedById.get(id) ?? changedFromById.get(id) ?? currentById.get(id))
    .filter((row): row is SectionRow => row != null)
    .map(clone);
}

export function applyCvDiff(
  snapshot: AiProfile,
  diff: CvDiff,
  direction: ApplyDirection,
): AiProfile {
  const next = clone(snapshot);

  if (diff.scalars.title) {
    next.title = direction === 'forward' ? diff.scalars.title.to : diff.scalars.title.from;
  }
  if (diff.scalars.summary) {
    next.summary = direction === 'forward' ? diff.scalars.summary.to : diff.scalars.summary.from;
  }
  if (diff.scalars.identity) {
    next.identity =
      direction === 'forward' ? clone(diff.scalars.identity.to) : clone(diff.scalars.identity.from);
  }
  if (diff.scalars.style) {
    next.style =
      direction === 'forward' ? clone(diff.scalars.style.to) : clone(diff.scalars.style.from);
  }
  if (diff.scalars.layout) {
    next.layout =
      direction === 'forward' ? clone(diff.scalars.layout.to) : clone(diff.scalars.layout.from);
  }

  for (const key of SECTION_KEYS) {
    const sectionDiff = diff.sections[key];
    if (!sectionDiff) continue;
    const applied = applySection(getSection(next, key), sectionDiff, direction);
    (next[key] as unknown as SectionRow[]) = applied;
  }

  return next;
}
