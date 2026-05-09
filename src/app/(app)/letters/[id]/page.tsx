import { notFound } from 'next/navigation';

import { LetterEditor } from '@/features/letters/components/letter-editor';
import { getCoverLetter } from '@/features/letters/controllers/get-letters';

type PageProps = { params: Promise<{ id: string }> };

export default async function LetterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const row = await getCoverLetter(id);
  if (!row) notFound();

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Cover letter</h1>
        <p className='text-xs text-muted-foreground'>
          Created {new Date(row.created_at).toLocaleString()} - {row.slug}
        </p>
      </header>
      <LetterEditor id={row.id} initialBody={row.body} pdfPath={row.pdf_path} />
    </section>
  );
}
