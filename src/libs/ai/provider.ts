import type { z } from 'zod';

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

export interface AiProvider {
  readonly name: 'stub' | 'openai';
  extractJobDescription(input: z.input<typeof extractJobDescriptionInputSchema>): Promise<ExtractedJd>;
  normalizeAchievement(input: z.input<typeof normalizeAchievementInputSchema>): Promise<NormalizedAchievement>;
  tailorCv(input: z.input<typeof tailorCvInputSchema>): Promise<TailoredSections>;
  generateCoverLetter(input: z.input<typeof coverLetterInputSchema>): Promise<CoverLetterOutput>;
  reviewProfile(input: z.input<typeof reviewProfileInputSchema>): Promise<AdviceNotes>;
  interviewAnswer(input: z.input<typeof interviewAnswerInputSchema>): Promise<InterviewAnswerOutput>;
  interviewReview(input: z.input<typeof interviewReviewInputSchema>): Promise<InterviewReview>;
}
