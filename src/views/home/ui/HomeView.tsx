import Link from 'next/link';

import { APP_DESCRIPTION, APP_DISPLAY_NAME } from '@/shared/config';
import { Button } from '@/shared/ui/button';

import { RevealGrid, RevealItem, RevealSection } from './home-motion';

export function HomeView() {
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
    <RevealSection className='flex flex-col items-center gap-6 text-center'>
      <h1 className='text-4xl font-bold tracking-tight lg:text-6xl'>{APP_DISPLAY_NAME}</h1>
      <p className='max-w-2xl text-lg text-muted-foreground'>{APP_DESCRIPTION}</p>
      <div className='flex gap-4'>
        <Button render={<Link href='/signup' />}>Get started</Button>
        <Button variant='outline' render={<Link href='/login' />}>
          Sign in
        </Button>
      </div>
    </RevealSection>
  );
}

function PrinciplesSection() {
  return (
    <RevealSection className='flex flex-col items-center gap-8'>
      <h2 className='text-2xl font-semibold'>How it works</h2>
      <RevealGrid className='grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <PrincipleCard
          title='One fact base'
          description='Your profile is the only place that holds canonical facts. Edit it directly or via chat.'
        />
        <PrincipleCard
          title='Achievements inbox'
          description='Capture wins as they happen. Integrate them into the right profile section when you decide.'
        />
        <PrincipleCard
          title='Vacancies log'
          description='Save job descriptions you care about. Reference them later when editing your CV.'
        />
        <PrincipleCard
          title='Chat-driven editor'
          description='Ask the agent to rewrite a bullet, switch templates, or change accents. Edits land on your selected CV.'
        />
        <PrincipleCard
          title='No fabrication'
          description='The agent edits text you provide. Missing data is marked, never invented.'
        />
        <PrincipleCard
          title='Live PDF preview'
          description='The previewer renders your selected CV to PDF and re-signs it after every chat edit.'
        />
      </RevealGrid>
    </RevealSection>
  );
}

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <RevealItem className='rounded-lg border p-6'>
      <h3 className='mb-2 font-semibold'>{title}</h3>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </RevealItem>
  );
}

function CTASection() {
  return (
    <RevealSection className='flex flex-col items-center gap-4 text-center'>
      <h2 className='text-2xl font-semibold'>Ready to start?</h2>
      <p className='text-muted-foreground'>Create an account and build your fact base.</p>
      <Button render={<Link href='/signup' />}>Create account</Button>
    </RevealSection>
  );
}
