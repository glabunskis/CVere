import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listAchievements } from '@/features/achievements/controllers/list-achievements';
import { listAdvice } from '@/features/advice/controllers/list-advice';
import { listCoverLetters } from '@/features/letters/controllers/get-letters';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { listTailoredCvs } from '@/features/tailored/controllers/get-tailored';

export default async function DashboardPage() {
  const profile = await getOrCreateProfile();
  if (!profile) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>Sign in to use CVere.</section>
    );
  }

  const [children, achievements, openAdvice, recentTailored, recentLetters] = await Promise.all([
    getProfileChildren(profile.id),
    listAchievements({ status: 'pending' }),
    listAdvice({ status: 'open' }),
    listTailoredCvs(),
    listCoverLetters(),
  ]);

  const completeness = computeCompleteness(profile.summary, children);

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
        <p className='text-sm text-muted-foreground'>
          Snapshot of your fact base, inbox, and recent tailored variants.
        </p>
      </header>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader>
            <CardTitle>Profile completeness</CardTitle>
            <CardDescription>Required sections covered.</CardDescription>
          </CardHeader>
          <CardContent>
            <span className='text-3xl font-semibold'>{completeness}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending achievements</CardTitle>
            <CardDescription>Inbox awaiting integration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/achievements?status=pending&section=all' className='text-3xl font-semibold underline'>
              {achievements.length}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open advice</CardTitle>
            <CardDescription>Critique notes that need action.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/advice' className='text-3xl font-semibold underline'>
              {openAdvice.length}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Tailored CVs and cover letters.</CardDescription>
          </CardHeader>
          <CardContent>
            <span className='text-3xl font-semibold'>{recentTailored.length + recentLetters.length}</span>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
          <header className='flex items-center justify-between'>
            <h2 className='text-base font-semibold'>Recent tailored CVs</h2>
            <Link className='text-xs text-primary underline' href='/tailored'>
              View all
            </Link>
          </header>
          {recentTailored.length === 0 ? (
            <p className='text-sm text-muted-foreground'>None yet.</p>
          ) : (
            <ul className='flex flex-col gap-2'>
              {recentTailored.slice(0, 5).map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/tailored/${row.id}`}
                    className='flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted'
                  >
                    <div>
                      <p className='text-sm font-medium'>
                        {row.job?.role ?? '[MISSING] role'}
                        {row.job?.company ? <span className='text-muted-foreground'> at {row.job.company}</span> : null}
                      </p>
                      <p className='text-xs text-muted-foreground'>{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={row.status === 'final' ? 'success' : 'warning'}>{row.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
          <header className='flex items-center justify-between'>
            <h2 className='text-base font-semibold'>Recent cover letters</h2>
            <Link className='text-xs text-primary underline' href='/letters'>
              View all
            </Link>
          </header>
          {recentLetters.length === 0 ? (
            <p className='text-sm text-muted-foreground'>None yet.</p>
          ) : (
            <ul className='flex flex-col gap-2'>
              {recentLetters.slice(0, 5).map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/letters/${row.id}`}
                    className='flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted'
                  >
                    <div>
                      <p className='text-sm font-medium'>
                        {row.job?.role ?? '[MISSING] role'}
                        {row.job?.company ? <span className='text-muted-foreground'> at {row.job.company}</span> : null}
                      </p>
                      <p className='text-xs text-muted-foreground'>{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function computeCompleteness(
  summary: string | null,
  children: {
    experience: unknown[];
    project: unknown[];
    skill: unknown[];
    education: unknown[];
    certification: unknown[];
    language: unknown[];
  },
): number {
  const checks = [
    summary !== null && summary.trim().length >= 40,
    children.experience.length > 0,
    children.project.length > 0,
    children.skill.length >= 3,
    children.education.length > 0,
    children.certification.length > 0,
    children.language.length > 0,
  ];
  const hits = checks.filter(Boolean).length;
  return Math.round((hits / checks.length) * 100);
}
