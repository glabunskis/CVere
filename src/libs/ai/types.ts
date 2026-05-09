import { z } from 'zod';

// =============================================================================
// Shared primitives
// =============================================================================

export const adviceTargetSchema = z.enum([
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certs',
  'languages',
  'global',
]);

export const adviceSeveritySchema = z.enum(['info', 'weak', 'gap']);

export const achievementSectionSchema = z.enum([
  'summary',
  'experience',
  'project',
  'skill',
  'education',
  'certification',
  'language',
]);

export const adviceNoteSchema = z.object({
  target: adviceTargetSchema,
  targetRefId: z.string().uuid().nullable().optional(),
  severity: adviceSeveritySchema,
  body: z.string().min(1),
});

export type AdviceNoteOutput = z.infer<typeof adviceNoteSchema>;

// =============================================================================
// Profile (input shape passed to the AI for tailoring/review)
// =============================================================================

export const aiProfileSchema = z.object({
  summary: z.string().nullable().optional(),
  experience: z
    .array(
      z.object({
        id: z.string().uuid(),
        company: z.string(),
        role: z.string(),
        location: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        summary: z.string().nullable().optional(),
        bullets: z.array(z.string()).default([]),
        stack: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
        bullets: z.array(z.string()).default([]),
        stack: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        category: z.string().nullable().optional(),
        level: z.string().nullable().optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        id: z.string().uuid(),
        institution: z.string(),
        degree: z.string().nullable().optional(),
        field: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        issuer: z.string().nullable().optional(),
        issuedAt: z.string().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
      }),
    )
    .default([]),
  languages: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        proficiency: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export type AiProfile = z.infer<typeof aiProfileSchema>;

// =============================================================================
// extractJobDescription
// =============================================================================

export const extractJobDescriptionInputSchema = z.object({
  rawText: z.string().min(1),
});

export const extractedJdSchema = z.object({
  requirements: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  seniority: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  ownership: z.array(z.string()).default([]),
});

export type ExtractedJd = z.infer<typeof extractedJdSchema>;

// =============================================================================
// normalizeAchievement
// =============================================================================

export const normalizeAchievementInputSchema = z.object({
  rawText: z.string().min(1),
});

export const normalizedAchievementSchema = z.object({
  normalizedText: z.string().min(1),
  suggestedSection: achievementSectionSchema,
});

export type NormalizedAchievement = z.infer<typeof normalizedAchievementSchema>;

// =============================================================================
// tailorCv
// =============================================================================

export const tailorCvInputSchema = z.object({
  profile: aiProfileSchema,
  jd: extractedJdSchema,
});

export const tailoredSectionsSchema = z.object({
  summary: z.string(),
  sections: z.object({
    experienceOrder: z.array(z.string().uuid()).default([]),
    experienceOverrides: z
      .record(
        z.string().uuid(),
        z.object({
          summary: z.string().nullable().optional(),
          bullets: z.array(z.string()).default([]),
        }),
      )
      .default({}),
    projectsOrder: z.array(z.string().uuid()).default([]),
    projectsOverrides: z
      .record(
        z.string().uuid(),
        z.object({
          description: z.string().nullable().optional(),
          bullets: z.array(z.string()).default([]),
        }),
      )
      .default({}),
    skillsOrder: z.array(z.string().uuid()).default([]),
    emphasis: z.array(z.string()).default([]),
  }),
});

export type TailoredSections = z.infer<typeof tailoredSectionsSchema>;

// =============================================================================
// generateCoverLetter
// =============================================================================

export const coverLetterInputSchema = z.object({
  profile: aiProfileSchema,
  jd: extractedJdSchema,
});

export const coverLetterSchema = z.object({
  body: z.string().min(1),
});

export type CoverLetterOutput = z.infer<typeof coverLetterSchema>;

// =============================================================================
// reviewProfile
// =============================================================================

export const reviewProfileInputSchema = z.object({
  profile: aiProfileSchema,
});

export const adviceNotesSchema = z.array(adviceNoteSchema);

export type AdviceNotes = z.infer<typeof adviceNotesSchema>;

// =============================================================================
// Interview prep
// =============================================================================

export const interviewAnswerInputSchema = z.object({
  profile: aiProfileSchema,
  question: z.string().min(1),
});

export const interviewAnswerSchema = z.object({
  answer: z.string().min(1),
});

export type InterviewAnswerOutput = z.infer<typeof interviewAnswerSchema>;

export const interviewReviewInputSchema = z.object({
  answers: z.array(
    z.object({
      id: z.string().uuid(),
      question: z.string(),
      answer: z.string(),
    }),
  ),
});

export const interviewReviewItemSchema = z.object({
  interviewAnswerId: z.string().uuid(),
  severity: adviceSeveritySchema,
  body: z.string().min(1),
});

export const interviewReviewSchema = z.array(interviewReviewItemSchema);

export type InterviewReview = z.infer<typeof interviewReviewSchema>;
