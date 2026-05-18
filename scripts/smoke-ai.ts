/**
 * Smoke test for the four LLM-backed AiProvider methods.
 *
 * Bypasses the safe-action / Supabase layers and calls getAiProvider()
 * directly with inline fixtures, so failures isolate to the provider.
 *
 * Usage: npm run smoke:ai
 *
 * Requires .env.local with:
 *   - AI_PROVIDER=openai
 *   - OPENAI_API_KEY=...
 *
 * Exits 1 on any failure or schema validation error.
 */

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import type { AiProfile, ExtractedJd } from '@/libs/ai';
import { getAiProvider, getAiProviderKind } from '@/libs/ai';

const RAW_JD = `
Senior Backend Engineer — Acme Payments

We are looking for a senior backend engineer to lead our payments platform.
You will design and ship resilient services in TypeScript on Node.js, work
with Postgres at scale, and own end-to-end delivery alongside product.

Requirements:
- 5+ years building production backend services
- Strong TypeScript, Node.js, Postgres
- Experience with Stripe or a comparable payments stack
- Comfortable with on-call and incident response
`.trim();

const RAW_ACHIEVEMENT =
  'shipped invoice export feature, cut support tickets by ~30% in the next quarter';

function buildProfile(): AiProfile {
  return {
    summary: 'Backend engineer with 6 years building payments and billing systems.',
    experience: [
      {
        id: randomUUID(),
        company: 'Northwind Bank',
        role: 'Senior Backend Engineer',
        location: 'Remote',
        startDate: '2022-03',
        endDate: null,
        isCurrent: true,
        summary: 'Lead engineer on the merchant payouts service.',
        bullets: [
          'Designed and shipped the v2 payouts pipeline (Node.js, Postgres, Stripe Connect)',
          'Cut payout failure rate from 1.4% to 0.2% over two quarters',
        ],
        stack: ['TypeScript', 'Node.js', 'Postgres', 'Stripe'],
      },
    ],
    projects: [],
    skills: [
      { id: randomUUID(), name: 'TypeScript', category: 'language', level: 'expert' },
      { id: randomUUID(), name: 'Postgres', category: 'database', level: 'advanced' },
    ],
    education: [],
    certifications: [],
    languages: [],
  };
}

type SmokeResult = {
  method: string;
  durationMs: number;
  ok: boolean;
  preview: string;
};

function preview(value: unknown, maxLen = 120): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const collapsed = str.replace(/\s+/g, ' ').trim();
  return collapsed.length > maxLen ? `${collapsed.slice(0, maxLen)}…` : collapsed;
}

async function run<T>(
  method: string,
  fn: () => Promise<T>,
  toPreview: (value: T) => string,
): Promise<SmokeResult> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    return { method, durationMs, ok: true, preview: toPreview(result) };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { method, durationMs, ok: false, preview: message };
  }
}

async function main(): Promise<void> {
  const kind = getAiProviderKind();
  console.log(`provider=${kind}`);
  if (kind === 'stub') {
    console.warn(
      'WARN: AI_PROVIDER=stub. Smoke results are deterministic stub output, not a real provider check.',
    );
  }

  const provider = getAiProvider();
  const profile = buildProfile();

  const jdResult = await run(
    'extractJobDescription',
    () => provider.extractJobDescription({ rawText: RAW_JD }),
    (out) =>
      `requirements=${out.requirements.length} stack=${out.stack.length} keywords=${out.keywords.length}`,
  );

  // Reuse the extracted JD for downstream calls when the first call succeeded;
  // otherwise fall back to a minimal JD so the rest of the smoke run still
  // exercises the provider end to end.
  const jd: ExtractedJd = jdResult.ok
    ? await provider.extractJobDescription({ rawText: RAW_JD })
    : {
        requirements: ['5+ years backend'],
        stack: ['TypeScript', 'Node.js', 'Postgres'],
        seniority: 'senior',
        keywords: ['payments', 'stripe'],
        ownership: [],
      };

  const achievementResult = await run(
    'normalizeAchievement',
    () => provider.normalizeAchievement({ rawText: RAW_ACHIEVEMENT }),
    (out) => `section=${out.suggestedSection} text="${preview(out.normalizedText, 80)}"`,
  );

  const tailorResult = await run(
    'tailorCv',
    () => provider.tailorCv({ profile, jd }),
    (out) =>
      `summaryChars=${out.summary.length} experienceOrder=${out.sections.experienceOrder.length} emphasis=${out.sections.emphasis.length}`,
  );

  const coverLetterResult = await run(
    'generateCoverLetter',
    () => provider.generateCoverLetter({ profile, jd }),
    (out) => `body="${preview(out.body, 100)}"`,
  );

  const results: SmokeResult[] = [
    jdResult,
    achievementResult,
    tailorResult,
    coverLetterResult,
  ];

  console.log('');
  console.log('method               | duration | ok    | preview');
  console.log('---------------------+----------+-------+--------------------------------------');
  for (const r of results) {
    const method = r.method.padEnd(20);
    const duration = `${r.durationMs}ms`.padStart(8);
    const ok = (r.ok ? 'ok' : 'FAIL').padEnd(5);
    console.log(`${method} | ${duration} | ${ok} | ${r.preview}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length}/${results.length} method(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} method(s) ok.`);
  }
}

main().catch((err) => {
  console.error('smoke:ai crashed:', err);
  process.exitCode = 1;
});
