'use client';

import Link from 'next/link';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddAchievementForm } from '@/features/achievements/components/add-achievement-form';
import { ChatPanel } from '@/features/chat/components/chat-panel';
import type { ChatSessionListItem, ChatUIMessage } from '@/features/chat/types';
import type { CvDateFormat } from '@/utils/format-date';

import type { CvTemplate } from '../schemas';

import { ImportTexForm } from './import-tex-form';
import { TemplatePicker } from './template-picker';

type SidebarLink = { id: string; href: string; label: string; meta?: string };

type Props = {
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  pendingAchievements: number;
  activeSessionId: string;
  sessions: ChatSessionListItem[];
  initialChatMessages: ChatUIMessage[];
};

export function PreviewerSidebar({
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
  pendingAchievements,
  activeSessionId,
  sessions,
  initialChatMessages,
}: Props) {
  const links: SidebarLink[] = [
    {
      id: 'achievements',
      href: '/achievements',
      label: 'Achievements',
      meta: pendingAchievements > 0 ? `${pendingAchievements} pending` : undefined,
    },
    { id: 'vacancies', href: '/vacancies', label: 'Vacancies' },
    { id: 'profile', href: '/profile', label: 'Edit fact base' },
  ];

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
          <ChatPanel
            sessionId={activeSessionId}
            sessions={sessions}
            initialMessages={initialChatMessages}
          />
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
