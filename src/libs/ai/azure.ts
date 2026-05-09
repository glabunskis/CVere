import type { z } from 'zod';

import type { AiProvider } from './provider';
import type {
  AdviceNotes,
  CoverLetterOutput,
  ExtractedJd,
  InterviewAnswerOutput,
  InterviewReview,
  NormalizedAchievement,
  TailoredSections,
} from './types';
import type {
  coverLetterInputSchema,
  extractJobDescriptionInputSchema,
  interviewAnswerInputSchema,
  interviewReviewInputSchema,
  normalizeAchievementInputSchema,
  reviewProfileInputSchema,
  tailorCvInputSchema,
} from './types';

// Placeholder. Wire to Azure OpenAI when AZURE_OPENAI_* env vars are set
// and replace each method with a real call that runs the Zod parser on the
// model output before returning.
export class AzureAiProvider implements AiProvider {
  readonly name = 'azure' as const;

  private notConfigured(method: string): never {
    throw new Error(
      `AzureAiProvider.${method} is not configured. Set AI_PROVIDER=stub for now or implement the Azure call.`,
    );
  }

  async extractJobDescription(_input: z.input<typeof extractJobDescriptionInputSchema>): Promise<ExtractedJd> {
    void _input;
    this.notConfigured('extractJobDescription');
  }

  async normalizeAchievement(
    _input: z.input<typeof normalizeAchievementInputSchema>,
  ): Promise<NormalizedAchievement> {
    void _input;
    this.notConfigured('normalizeAchievement');
  }

  async tailorCv(_input: z.input<typeof tailorCvInputSchema>): Promise<TailoredSections> {
    void _input;
    this.notConfigured('tailorCv');
  }

  async generateCoverLetter(_input: z.input<typeof coverLetterInputSchema>): Promise<CoverLetterOutput> {
    void _input;
    this.notConfigured('generateCoverLetter');
  }

  async reviewProfile(_input: z.input<typeof reviewProfileInputSchema>): Promise<AdviceNotes> {
    void _input;
    this.notConfigured('reviewProfile');
  }

  async interviewAnswer(_input: z.input<typeof interviewAnswerInputSchema>): Promise<InterviewAnswerOutput> {
    void _input;
    this.notConfigured('interviewAnswer');
  }

  async interviewReview(_input: z.input<typeof interviewReviewInputSchema>): Promise<InterviewReview> {
    void _input;
    this.notConfigured('interviewReview');
  }
}
