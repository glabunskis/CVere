import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { AdviceCard } from '@/features/advice/components/advice-card';
import { ReviewButton } from '@/features/advice/components/review-button';
import { listAdvice } from '@/features/advice/controllers/list-advice';
import { PresentationEditor } from '@/features/tailored/components/presentation-editor';
import { SnapshotView } from '@/features/tailored/components/snapshot-view';
import { getTailoredCv } from '@/features/tailored/controllers/get-tailored';
import { profileSnapshotSchema } from '@/features/tailored/schemas';

type PageProps = { params: Promise<{ id: string }> };

type Sections = {
  summary?: string | null;
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
  emphasis?: string[];
};

export default async function TailoredVariantPage({ params }: PageProps) {
  const { id } = await params;
  const row = await getTailoredCv(id);
  if (!row) notFound();

  const snapshotResult = profileSnapshotSchema.safeParse(row.profile_snapshot);
  if (!snapshotResult.success) notFound();
  const snapshot = snapshotResult.data;

  const sections = (typeof row.sections === 'object' && row.sections !== null
    ? row.sections
    : {}) as Sections;

  const advice = await listAdvice({ tailoredCvId: row.id, status: 'all' });

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Tailored CV</h1>
          <p className='text-xs text-muted-foreground'>
            Created {new Date(row.created_at).toLocaleString()} - {row.slug}
          </p>
        </div>
        <Badge variant={row.status === 'final' ? 'success' : 'warning'}>{row.status}</Badge>
      </header>

      <PresentationEditor id={row.id} status={row.status} pdfPath={row.pdf_path} sections={sections} />

      <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
        <header className='flex items-center justify-between gap-2'>
          <div>
            <h2 className='text-base font-semibold'>Advice</h2>
            <p className='text-xs text-muted-foreground'>
              Annotations on this variant. Apply only mutates this presentation, never the master profile.
            </p>
          </div>
          <ReviewButton tailoredCvId={row.id} label='Review this variant' />
        </header>
        {advice.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No advice yet for this variant.</p>
        ) : (
          <div className='grid gap-2'>
            {advice.map((note) => (
              <AdviceCard key={note.id} row={note} compact />
            ))}
          </div>
        )}
      </div>

      <SnapshotView
        snapshot={snapshot}
        emphasis={sections.emphasis ?? []}
        experienceOrder={sections.experienceOrder}
        projectsOrder={sections.projectsOrder}
        skillsOrder={sections.skillsOrder}
      />
    </section>
  );
}
