import { z } from 'zod';

export const addInterviewAnswerSchema = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
});

export const updateInterviewAnswerSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
});

export const deleteInterviewAnswerSchema = z.object({ id: z.string().uuid() });

export const reviewInterviewSchema = z.object({});

export const applyInterviewAdviceSchema = z.object({ id: z.string().uuid() });
export const dismissInterviewAdviceSchema = z.object({ id: z.string().uuid() });

export const draftInterviewAnswerSchema = z.object({
  question: z.string().min(1).max(1000),
});
