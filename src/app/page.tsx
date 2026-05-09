import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_DESCRIPTION, APP_DISPLAY_NAME } from '@/config';
import { getSession } from '@/features/account/controllers/get-session';

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className='flex flex-col gap-16 py-16 lg:gap-32 lg:py-32'>
      <HeroSection />
      <PrinciplesSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className='flex flex-col items-center gap-6 text-center'>
      <h1 className='text-4xl font-bold tracking-tight lg:text-6xl'>{APP_DISPLAY_NAME}</h1>
      <p className='max-w-2xl text-lg text-muted-foreground'>{APP_DESCRIPTION}</p>
      <div className='flex gap-4'>
        <Button render={<Link href='/signup' />}>Get started</Button>
        <Button variant='outline' render={<Link href='/login' />}>
          Sign in
        </Button>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  return (
    <section className='flex flex-col items-center gap-8'>
      <h2 className='text-2xl font-semibold'>How it works</h2>
      <div className='grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <PrincipleCard
          title='One fact base'
          description='Your profile is the only place that holds canonical facts. Tailored variants never overwrite it.'
        />
        <PrincipleCard
          title='Achievements inbox'
          description='Capture wins as they happen. Normalize and integrate them into the right profile section on demand.'
        />
        <PrincipleCard
          title='Vacancy-driven tailoring'
          description='Paste a job description, see matches and gaps, then generate a tailored CV and cover letter.'
        />
        <PrincipleCard
          title='Critique, never auto-applied'
          description='AI review writes advice notes. You decide what to apply or dismiss.'
        />
        <PrincipleCard
          title='No fabrication'
          description='AI tailors by emphasis and ordering. Missing data is marked, never invented.'
        />
        <PrincipleCard
          title='PDF export'
          description='Render tailored CVs and cover letters to PDF straight from the app.'
        />
      </div>
    </section>
  );
}

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className='rounded-lg border p-6'>
      <h3 className='mb-2 font-semibold'>{title}</h3>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
  );
}

function CTASection() {
  return (
    <section className='flex flex-col items-center gap-4 text-center'>
      <h2 className='text-2xl font-semibold'>Ready to start?</h2>
      <p className='text-muted-foreground'>Create an account and build your fact base.</p>
      <Button render={<Link href='/signup' />}>Create account</Button>
    </section>
  );
}
