import { z } from 'zod';

import type { AiProvider } from './provider';
import {
  type AdviceNotes,
  adviceNotesSchema,
  coverLetterInputSchema,
  type CoverLetterOutput,
  coverLetterSchema,
  type ExtractedJd,
  extractedJdSchema,
  extractJobDescriptionInputSchema,
  interviewAnswerInputSchema,
  type InterviewAnswerOutput,
  interviewAnswerSchema,
  type InterviewReview,
  interviewReviewInputSchema,
  interviewReviewSchema,
  normalizeAchievementInputSchema,
  type NormalizedAchievement,
  normalizedAchievementSchema,
  reviewProfileInputSchema,
  tailorCvInputSchema,
  type TailoredSections,
  tailoredSectionsSchema,
} from './types';

const STUB = '[STUB]';
const MISSING = '[MISSING]';

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededFloat(seed: number, salt: number): number {
  // xorshift32-ish; deterministic for the same (seed, salt) pair.
  let x = seed ^ salt;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10_000) / 10_000;
}

async function simulateLatency(seed: number): Promise<void> {
  const r = seededFloat(seed, 0xa5a5);
  const delayMs = 300 + Math.floor(r * 500);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function maybeFail(seed: number): void {
  const rate = Number.parseFloat(process.env.AI_STUB_FAILURE_RATE ?? '0');
  if (Number.isNaN(rate) || rate <= 0) return;

  const r = seededFloat(seed, 0xfeed);
  if (r < rate) {
    throw new Error(`${STUB} simulated AI failure (AI_STUB_FAILURE_RATE=${rate})`);
  }
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .filter((token) => token.length >= 2);
}

function extractFromRawJd(rawText: string): ExtractedJd {
  const tokens = tokenize(rawText);
  const stackHints = new Set([
    'typescript',
    'javascript',
    'react',
    'next.js',
    'nextjs',
    'node',
    'node.js',
    'python',
    'go',
    'rust',
    'aws',
    'gcp',
    'azure',
    'docker',
    'kubernetes',
    'postgres',
    'postgresql',
    'mysql',
    'redis',
    'graphql',
    'rest',
    'tailwind',
    'kafka',
  ]);
  const stack = dedupeStrings(tokens.filter((token) => stackHints.has(token)));

  const requirementLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]/.test(line) || /required|must|years/i.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, ''));

  const requirements = dedupeStrings(requirementLines).slice(0, 12);

  const seniorityMatch = rawText.match(/\b(intern|junior|mid|senior|staff|principal|lead)\b/i);
  const seniority = seniorityMatch ? seniorityMatch[1].toLowerCase() : null;

  const keywords = dedupeStrings(
    tokens.filter((token) => token.length >= 4 && !stackHints.has(token)).slice(0, 20),
  );

  const ownership = dedupeStrings(
    rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /own(ership)?|drive|lead|deliver/i.test(line))
      .slice(0, 5),
  );

  return {
    requirements: requirements.length ? requirements : [`${MISSING} no bulleted requirements detected`],
    stack,
    seniority,
    keywords,
    ownership,
  };
}

function pickTargetSection(rawText: string): NormalizedAchievement['suggestedSection'] {
  const lower = rawText.toLowerCase();
  if (/(school|university|degree|graduat)/.test(lower)) return 'education';
  if (/(certif|aws certified|coursera|udemy)/.test(lower)) return 'certification';
  if (/(language|spanish|english|french|german|dutch|russian)/.test(lower)) return 'language';
  if (/(project|side project|built|launched|shipped)/.test(lower)) return 'project';
  if (/(react|typescript|python|kubernetes|sql|docker)/.test(lower)) return 'skill';
  if (/(team|company|client|customer|role|promoted)/.test(lower)) return 'experience';
  return 'experience';
}

export class StubAiProvider implements AiProvider {
  readonly name = 'stub' as const;

  async extractJobDescription(
    input: z.input<typeof extractJobDescriptionInputSchema>,
  ): Promise<ExtractedJd> {
    const parsed = extractJobDescriptionInputSchema.parse(input);
    const seed = fnv1a(parsed.rawText);
    await simulateLatency(seed);
    maybeFail(seed);

    return extractedJdSchema.parse(extractFromRawJd(parsed.rawText));
  }

  async normalizeAchievement(
    input: z.input<typeof normalizeAchievementInputSchema>,
  ): Promise<NormalizedAchievement> {
    const parsed = normalizeAchievementInputSchema.parse(input);
    const seed = fnv1a(parsed.rawText);
    await simulateLatency(seed);
    maybeFail(seed);

    const trimmed = parsed.rawText.trim();
    const firstLine = trimmed.split(/\r?\n/)[0]?.slice(0, 220) ?? trimmed.slice(0, 220);
    const normalizedText = `${STUB} ${firstLine}`.trim();

    return normalizedAchievementSchema.parse({
      normalizedText,
      suggestedSection: pickTargetSection(parsed.rawText),
    });
  }

  async tailorCv(input: z.input<typeof tailorCvInputSchema>): Promise<TailoredSections> {
    const parsed = tailorCvInputSchema.parse(input);
    const seed = fnv1a(JSON.stringify(parsed));
    await simulateLatency(seed);
    maybeFail(seed);

    const summary = parsed.profile.summary
      ? `${STUB} ${parsed.profile.summary}`
      : `${STUB} ${MISSING} summary - add one in your profile`;

    const experienceOrder = parsed.profile.experience.map((exp) => exp.id);
    const projectsOrder = parsed.profile.projects.map((project) => project.id);
    const skillsOrder = [...parsed.profile.skills]
      .sort((a, b) => {
        const aHit = parsed.jd.stack.some((s) => a.name.toLowerCase().includes(s.toLowerCase())) ? 0 : 1;
        const bHit = parsed.jd.stack.some((s) => b.name.toLowerCase().includes(s.toLowerCase())) ? 0 : 1;
        return aHit - bHit;
      })
      .map((skill) => skill.id);

    return tailoredSectionsSchema.parse({
      summary,
      sections: {
        experienceOrder,
        experienceOverrides: {},
        projectsOrder,
        projectsOverrides: {},
        skillsOrder,
        emphasis: dedupeStrings([...parsed.jd.stack, ...parsed.jd.keywords.slice(0, 5)]),
      },
    });
  }

  async generateCoverLetter(
    input: z.input<typeof coverLetterInputSchema>,
  ): Promise<CoverLetterOutput> {
    const parsed = coverLetterInputSchema.parse(input);
    const seed = fnv1a(JSON.stringify(parsed));
    await simulateLatency(seed);
    maybeFail(seed);

    const role = parsed.jd.requirements[0] ?? `${MISSING} role`;
    const stack = parsed.jd.stack.slice(0, 3).join(', ') || MISSING;
    const body = [
      `${STUB} Cover letter draft.`,
      ``,
      `Re: ${role}`,
      ``,
      parsed.profile.summary ?? `${MISSING} summary - add one in your profile`,
      ``,
      `Stack alignment: ${stack}.`,
      ``,
      `Available on request.`,
    ].join('\n');

    return coverLetterSchema.parse({ body });
  }

  async reviewProfile(
    input: z.input<typeof reviewProfileInputSchema>,
  ): Promise<AdviceNotes> {
    const parsed = reviewProfileInputSchema.parse(input);
    const seed = fnv1a(JSON.stringify(parsed));
    await simulateLatency(seed);
    maybeFail(seed);

    const notes: AdviceNotes = [];
    const profile = parsed.profile;

    if (!profile.summary || profile.summary.trim().length < 40) {
      notes.push({
        target: 'summary',
        targetRefId: null,
        severity: 'weak',
        body: `${STUB} Summary is short. Aim for 2-3 lines highlighting your strongest evidence.`,
      });
    }

    if ((profile.experience ?? []).length === 0) {
      notes.push({
        target: 'experience',
        targetRefId: null,
        severity: 'gap',
        body: `${STUB} No experience entries. Add at least one role with concrete bullets.`,
      });
    }

    for (const exp of profile.experience ?? []) {
      if ((exp.bullets ?? []).length < 2) {
        notes.push({
          target: 'experience',
          targetRefId: exp.id,
          severity: 'weak',
          body: `${STUB} ${exp.role} at ${exp.company}: add at least 2 concrete bullets.`,
        });
      }
    }

    if ((profile.skills ?? []).length < 5) {
      notes.push({
        target: 'skills',
        targetRefId: null,
        severity: 'info',
        body: `${STUB} Skills list is thin. Add core stack items relevant to target roles.`,
      });
    }

    return adviceNotesSchema.parse(notes);
  }

  async interviewAnswer(
    input: z.input<typeof interviewAnswerInputSchema>,
  ): Promise<InterviewAnswerOutput> {
    const parsed = interviewAnswerInputSchema.parse(input);
    const seed = fnv1a(JSON.stringify(parsed));
    await simulateLatency(seed);
    maybeFail(seed);

    const answer = `${STUB} draft answer to: "${parsed.question}". Anchor on a concrete situation, action, and result from your profile.`;
    return interviewAnswerSchema.parse({ answer });
  }

  async interviewReview(
    input: z.input<typeof interviewReviewInputSchema>,
  ): Promise<InterviewReview> {
    const parsed = interviewReviewInputSchema.parse(input);
    const seed = fnv1a(JSON.stringify(parsed));
    await simulateLatency(seed);
    maybeFail(seed);

    const review: InterviewReview = parsed.answers.map((entry) => ({
      interviewAnswerId: entry.id,
      severity: entry.answer.length < 80 ? 'weak' : 'info',
      body:
        entry.answer.length < 80
          ? `${STUB} answer is too short - expand with situation, action, and outcome.`
          : `${STUB} answer scans clearly. Tighten the result with a concrete metric if available.`,
    }));

    return interviewReviewSchema.parse(review);
  }
}
