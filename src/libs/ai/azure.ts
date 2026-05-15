import { generateText, Output } from 'ai';
import type { z } from 'zod';

import { logger } from '@/libs/logger';

import { getChatModel } from './chat-model';
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

const SYSTEM_PROMPTS = {
  extractJobDescription:
    'You extract structured fields from raw job descriptions. Return clean, deduplicated arrays. Do not invent values; if the input does not mention a field, leave it empty or null.',
  normalizeAchievement:
    'You rewrite a single user achievement as one tight, recruiter-friendly bullet (active voice, past tense for completed work, quantify only when the user provided numbers) and pick the most likely CV section it belongs to.',
  tailorCv:
    'You tailor a master CV to a specific job description. Reorder sections, rewrite bullets, and surface emphasis keywords. Never invent metrics or experience that the profile does not include. UUID ids in the output must be drawn from the provided profile.',
  generateCoverLetter:
    'You write a concise, professional cover letter (no greetings, no sign-off block) anchored on the candidate\'s actual profile and the target job description. Plain text, no markdown.',
  reviewProfile:
    'You review a CV profile and produce concrete, actionable advice notes. Severity reflects impact: gap (missing critical info), weak (present but underdeveloped), info (nice-to-have). Never invent metrics or facts about the candidate.',
  interviewAnswer:
    'You draft a strong interview answer for the candidate, anchored on real evidence from their profile. Use a clear situation-action-result arc. No filler. No invented metrics.',
  interviewReview:
    'You review the candidate\'s interview answers. For each answer, return one short feedback note with a severity reflecting how complete and concrete the answer is.',
} as const;

type AzureMethodName = keyof typeof SYSTEM_PROMPTS;

interface RunOptions<Schema extends z.ZodTypeAny> {
  method: AzureMethodName;
  schema: Schema;
  prompt: string;
  schemaName: string;
  schemaDescription?: string;
}

async function runStructured<Schema extends z.ZodTypeAny>({
  method,
  schema,
  prompt,
  schemaName,
  schemaDescription,
}: RunOptions<Schema>): Promise<z.infer<Schema>> {
  const start = Date.now();
  try {
    const { output } = await generateText({
      model: getChatModel(),
      output: Output.object({
        schema: schema as z.ZodType,
        name: schemaName,
        description: schemaDescription,
      }),
      system: SYSTEM_PROMPTS[method],
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: `azure-provider:${method}`,
      },
    });
    logger.info(
      { method, durationMs: Date.now() - start },
      'azure-provider call completed',
    );
    return output as z.infer<Schema>;
  } catch (err) {
    logger.error(
      { method, durationMs: Date.now() - start, err },
      'azure-provider call failed',
    );
    throw err;
  }
}

export class AzureAiProvider implements AiProvider {
  readonly name = 'azure' as const;

  async extractJobDescription(
    input: z.input<typeof extractJobDescriptionInputSchema>,
  ): Promise<ExtractedJd> {
    const parsed = extractJobDescriptionInputSchema.parse(input);
    return runStructured({
      method: 'extractJobDescription',
      schema: extractedJdSchema,
      schemaName: 'ExtractedJobDescription',
      schemaDescription: 'Structured extraction of a raw job description.',
      prompt: `Extract the job description below.\n\n---\n${parsed.rawText}\n---`,
    });
  }

  async normalizeAchievement(
    input: z.input<typeof normalizeAchievementInputSchema>,
  ): Promise<NormalizedAchievement> {
    const parsed = normalizeAchievementInputSchema.parse(input);
    return runStructured({
      method: 'normalizeAchievement',
      schema: normalizedAchievementSchema,
      schemaName: 'NormalizedAchievement',
      schemaDescription:
        'A single tightened achievement bullet plus the suggested CV section.',
      prompt: `Normalize the achievement below.\n\n---\n${parsed.rawText}\n---`,
    });
  }

  async tailorCv(input: z.input<typeof tailorCvInputSchema>): Promise<TailoredSections> {
    const parsed = tailorCvInputSchema.parse(input);
    return runStructured({
      method: 'tailorCv',
      schema: tailoredSectionsSchema,
      schemaName: 'TailoredCv',
      schemaDescription:
        'Tailored CV summary, section orderings, and per-item overrides drawn from the master profile.',
      prompt:
        `Profile (master CV, source of truth for ids and facts):\n` +
        `${JSON.stringify(parsed.profile)}\n\n` +
        `Target job description:\n${JSON.stringify(parsed.jd)}`,
    });
  }

  async generateCoverLetter(
    input: z.input<typeof coverLetterInputSchema>,
  ): Promise<CoverLetterOutput> {
    const parsed = coverLetterInputSchema.parse(input);
    return runStructured({
      method: 'generateCoverLetter',
      schema: coverLetterSchema,
      schemaName: 'CoverLetter',
      schemaDescription: 'Plain-text cover letter body, no greeting or sign-off block.',
      prompt:
        `Profile:\n${JSON.stringify(parsed.profile)}\n\n` +
        `Job description:\n${JSON.stringify(parsed.jd)}`,
    });
  }

  async reviewProfile(input: z.input<typeof reviewProfileInputSchema>): Promise<AdviceNotes> {
    const parsed = reviewProfileInputSchema.parse(input);
    return runStructured({
      method: 'reviewProfile',
      schema: adviceNotesSchema,
      schemaName: 'AdviceNotes',
      schemaDescription: 'Array of advice notes for the candidate.',
      prompt: `Review the profile below and return advice notes.\n\n${JSON.stringify(parsed.profile)}`,
    });
  }

  async interviewAnswer(
    input: z.input<typeof interviewAnswerInputSchema>,
  ): Promise<InterviewAnswerOutput> {
    const parsed = interviewAnswerInputSchema.parse(input);
    return runStructured({
      method: 'interviewAnswer',
      schema: interviewAnswerSchema,
      schemaName: 'InterviewAnswer',
      schemaDescription: 'Drafted answer to a single interview question.',
      prompt:
        `Profile:\n${JSON.stringify(parsed.profile)}\n\n` +
        `Question:\n${parsed.question}`,
    });
  }

  async interviewReview(
    input: z.input<typeof interviewReviewInputSchema>,
  ): Promise<InterviewReview> {
    const parsed = interviewReviewInputSchema.parse(input);
    return runStructured({
      method: 'interviewReview',
      schema: interviewReviewSchema,
      schemaName: 'InterviewReview',
      schemaDescription:
        'One feedback item per interview answer (matched by interviewAnswerId).',
      prompt: `Review these interview answers:\n${JSON.stringify(parsed.answers)}`,
    });
  }
}
