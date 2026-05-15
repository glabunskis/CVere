'use client';

import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddAchievementForm } from '@/features/achievements/components/add-achievement-form';
import { ChatPanel } from '@/features/chat/components/chat-panel';
import type { ChatUIMessage } from '@/features/chat/types';
import type { CvDateFormat } from '@/utils/format-date';

import { updateCvPreferences } from '../actions/update-cv-preferences';
import type { CvTemplate } from '../schemas';

import { ImportTexForm } from './import-tex-form';
import { TemplatePicker } from './template-picker';

type SidebarLink = { id: string; href: string; label: string; meta?: string };

type Props = {
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  pinnedTailoredCvId: string | null;
  pendingAchievements: number;
  openAdvice: number;
  recentTailored: { id: string; label: string }[];
  recentLetters: { id: string; label: string }[];
  initialChatMessages: ChatUIMessage[];
};

export function PreviewerSidebar({
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
  pinnedTailoredCvId,
  pendingAchievements,
  openAdvice,
  recentTailored,
  recentLetters,
  initialChatMessages,
}: Props) {
  const links: SidebarLink[] = [
    { id: 'achievements', href: '/achievements', label: 'Achievements', meta: pendingAchievements > 0 ? `${pendingAchievements} pending` : undefined },
    { id: 'advice', href: '/advice', label: 'Advice', meta: openAdvice > 0 ? `${openAdvice} open` : undefined },
    { id: 'interview', href: '/interview', label: 'Interview prep' },
    { id: 'vacancies', href: '/vacancies', label: 'Vacancies' },
    { id: 'profile', href: '/profile', label: 'Edit fact base' },
  ];

  const { execute: pin } = useAction(updateCvPreferences, {
    onSuccess: () => toast.success('Pinned'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to pin'),
  });

  return (
    <aside className='flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card'>
      <Tabs defaultValue='library' className='flex h-full min-h-0 flex-col gap-0'>
        <div className='border-b px-3 py-2'>
          <TabsList className='w-full' variant='line'>
            <TabsTrigger value='library'>Library</TabsTrigger>
            <TabsTrigger value='chat'>Chat</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='library' keepMounted className='min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='flex flex-col gap-4 p-4'>
              <Section title='Style'>
                <TemplatePicker
                  template={template}
                  accentHex={accentHex}
                  educationDateFormat={educationDateFormat}
                  certificationDateFormat={certificationDateFormat}
                />
              </Section>

              <Separator />

              <Section title='Capture'>
                <AddAchievementForm />
              </Section>

              <Separator />

              <Section title='Tailored variants'>
                {recentTailored.length === 0 ? (
                  <EmptyHint
                    text='No tailored CVs yet.'
                    cta={{ href: '/vacancies', label: 'Add a vacancy' }}
                  />
                ) : (
                  <ul className='flex flex-col gap-1'>
                    {recentTailored.slice(0, 5).map((row) => {
                      const isPinned = pinnedTailoredCvId === row.id;
                      return (
                        <li
                          key={row.id}
                          className='flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-sm'
                        >
                          <Link href={`/tailored/${row.id}`} className='truncate hover:underline'>
                            {row.label}
                          </Link>
                          <Button
                            size='xs'
                            variant={isPinned ? 'secondary' : 'ghost'}
                            onClick={() => pin({ pinnedTailoredCvId: isPinned ? null : row.id })}
                          >
                            {isPinned ? 'Unpin' : 'Pin'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href='/tailored' className='text-xs text-primary underline-offset-2 hover:underline'>
                  All tailored CVs
                </Link>
              </Section>

              <Separator />

              <Section title='Cover letters'>
                {recentLetters.length === 0 ? (
                  <EmptyHint text='No cover letters yet.' cta={{ href: '/letters', label: 'Generate one' }} />
                ) : (
                  <ul className='flex flex-col gap-1'>
                    {recentLetters.slice(0, 5).map((row) => (
                      <li key={row.id} className='rounded-md border bg-background px-2 py-1.5 text-sm'>
                        <Link href={`/letters/${row.id}`} className='hover:underline'>
                          {row.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href='/letters' className='text-xs text-primary underline-offset-2 hover:underline'>
                  All letters
                </Link>
              </Section>

              <Separator />

              <Section title='Quick links'>
                <ul className='flex flex-col gap-1 text-sm'>
                  {links.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={l.href}
                        className='flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted'
                      >
                        <span>{l.label}</span>
                        {l.meta ? <span className='text-xs text-muted-foreground'>{l.meta}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>

              <Separator />

              <Section title='Import'>
                <ImportTexForm />
              </Section>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='chat' keepMounted className='min-h-0 flex-1'>
          <ChatPanel initialMessages={initialChatMessages} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{title}</h3>
      {children}
    </div>
  );
}

function EmptyHint({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return (
    <div className='flex flex-col gap-1 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground'>
      <span>{text}</span>
      <Link href={cta.href} className='text-primary underline-offset-2 hover:underline'>
        {cta.label}
      </Link>
    </div>
  );
}
