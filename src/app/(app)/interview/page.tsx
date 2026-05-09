import { AddAnswerForm } from '@/features/interview/components/add-answer-form';
import { AnswerCard } from '@/features/interview/components/answer-card';
import { ReviewInterviewButton } from '@/features/interview/components/review-button';
import {
  listInterviewAdvice,
  listInterviewAnswers,
} from '@/features/interview/controllers/get-interview';

export default async function InterviewPage() {
  const [answers, advice] = await Promise.all([listInterviewAnswers(), listInterviewAdvice()]);

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Interview prep</h1>
          <p className='text-sm text-muted-foreground'>
            Spoken answers anchored on your fact base. Same review-and-apply discipline.
          </p>
        </div>
        <ReviewInterviewButton />
      </header>

      <AddAnswerForm />

      {answers.length === 0 ? (
        <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
          No answers yet. Add one or click &quot;AI draft answer&quot;.
        </p>
      ) : (
        <div className='flex flex-col gap-3'>
          {answers.map((row) => (
            <AnswerCard key={row.id} row={row} advice={advice} />
          ))}
        </div>
      )}
    </section>
  );
}
