'use client';

import {
  BookOpenIcon,
  PaletteIcon,
  PanelRightIcon,
  PenIcon,
  TrophyIcon,
} from 'lucide-react';
import type React from 'react';

import type { AchievementRow } from '@/entities/achievement';
import type { CvRow } from '@/entities/cv/cv-service';
import type { ProfileChildren } from '@/entities/cv/get-cv-children';
import type { CvLibraryData } from '@/entities/cv/list-cv-library';
import { AchievementCard } from '@/features/achievements/components/achievement-card';
import { AddAchievementForm } from '@/features/achievements/components/add-achievement-form';
import { ImportTexForm } from '@/features/cv-import';
import type { CvTemplate } from '@/features/cv-style';
import { TemplatePicker } from '@/features/cv-style';
import { FactEditor } from '@/features/profile-editor/components/fact-editor';
import type { CvDateFormat } from '@/shared/lib/format-date';
import { motion, tweenFast } from '@/shared/lib/motion';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CvLibraryPanel } from '@/widgets/cv-library';

type Props = {
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  experienceDateFormat: CvDateFormat;
  cvLibrary: CvLibraryData;
  achievements: AchievementRow[];
  summary: string | null;
  contact: CvRow;
  fallbackEmail: string | null;
  fallbackFullName: string | null;
  sections: ProfileChildren;
  skillCategories: string[];
  activeTab: string;
  onTabChange: (value: string) => void;
  onCollapse?: () => void;
};

// Crossfades a tab label in/out as the panel crosses the ~22rem container-query
// threshold: opacity fades while the grid column tweens 0fr->1fr (width) and the
// negative margin absorbs the icon gap when collapsed, so the swap is animated
// rather than an instant show/hide.
const TAB_LABEL_REVEAL =
  '-ml-1.5 grid min-w-0 grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity,margin] duration-200 ease-out @min-[22rem]/control:ml-0 @min-[22rem]/control:grid-cols-[1fr] @min-[22rem]/control:opacity-100';

export function ControlPanel({
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
  experienceDateFormat,
  cvLibrary,
  achievements,
  summary,
  contact,
  fallbackEmail,
  fallbackFullName,
  sections,
  skillCategories,
  activeTab,
  onTabChange,
  onCollapse,
}: Props) {
  return (
    <aside className='@container/control flex h-full min-h-0 flex-col overflow-hidden bg-card'>
      <Tabs value={activeTab} onValueChange={onTabChange} className='flex h-full min-h-0 flex-col gap-0'>
        <div className='flex h-[52px] shrink-0 items-center gap-1 border-b border-border bg-card px-2'>
          <TabsList
            className='min-w-0 flex-1 [&_[data-slot=tabs-trigger]]:after:bg-primary [&_[data-slot=tabs-trigger][data-active]]:text-foreground'
            variant='line'
          >
            <TabsTrigger value='library' title='Library' aria-label='Library'>
              <BookOpenIcon className='shrink-0' strokeWidth={2} />
              <span className={TAB_LABEL_REVEAL}>
                <span className='min-w-0 overflow-hidden whitespace-nowrap'>Library</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value='editor' title='CV editor' aria-label='CV editor'>
              <PenIcon className='shrink-0' strokeWidth={2} />
              <span className={TAB_LABEL_REVEAL}>
                <span className='min-w-0 overflow-hidden whitespace-nowrap'>CV editor</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value='style' title='Style' aria-label='Style'>
              <PaletteIcon className='shrink-0' strokeWidth={2} />
              <span className={TAB_LABEL_REVEAL}>
                <span className='min-w-0 overflow-hidden whitespace-nowrap'>Style</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value='capture' title='Achievements' aria-label='Achievements'>
              <TrophyIcon className='shrink-0' strokeWidth={2} />
              <span className={TAB_LABEL_REVEAL}>
                <span className='min-w-0 overflow-hidden whitespace-nowrap'>Achievements</span>
              </span>
            </TabsTrigger>
          </TabsList>
          {onCollapse && (
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              onClick={onCollapse}
              aria-label='Collapse control panel'
            >
              <PanelRightIcon className='size-5' strokeWidth={2} />
            </Button>
          )}
        </div>

        <TabsContent value='library' keepMounted className='min-h-0 flex-1'>
          <motion.div
            className='h-full'
            initial={false}
            animate={activeTab === 'library' ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={tweenFast}
          >
            <ScrollArea className='h-full'>
              <div className='flex flex-col gap-4 p-4'>
                <Section title='CV library'>
                  <CvLibraryPanel library={cvLibrary} />
                </Section>

                <Section title='Import'>
                  <ImportTexForm />
                </Section>
              </div>
            </ScrollArea>
          </motion.div>
        </TabsContent>

        <TabsContent value='editor' keepMounted className='min-h-0 flex-1'>
          <motion.div
            className='h-full'
            initial={false}
            animate={activeTab === 'editor' ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={tweenFast}
          >
            <ScrollArea className='h-full'>
              <div className='p-4'>
                <FactEditor
                  // Remount the editor whenever the underlying CV data actually
                  // changes (chat edit, undo/redo, switching CV) so the field
                  // editors that seed local state from props (summary, contact)
                  // pick up fresh values. Manual in-editor saves don't change
                  // these props (no `router.refresh()`), so they never trigger a
                  // remount and can't clobber other unsaved fields.
                  key={JSON.stringify({ summary, contact, sections })}
                  summary={summary}
                  contact={contact}
                  fallbackEmail={fallbackEmail}
                  fallbackFullName={fallbackFullName}
                  sections={sections}
                  skillCategories={skillCategories}
                  educationDateFormat={educationDateFormat}
                  certificationDateFormat={certificationDateFormat}
                  experienceDateFormat={experienceDateFormat}
                />
              </div>
            </ScrollArea>
          </motion.div>
        </TabsContent>

        <TabsContent value='style' keepMounted className='min-h-0 flex-1'>
          <motion.div
            className='h-full'
            initial={false}
            animate={activeTab === 'style' ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={tweenFast}
          >
            <ScrollArea className='h-full'>
              <div className='p-4'>
                <TemplatePicker
                  template={template}
                  accentHex={accentHex}
                  educationDateFormat={educationDateFormat}
                  certificationDateFormat={certificationDateFormat}
                  experienceDateFormat={experienceDateFormat}
                />
              </div>
            </ScrollArea>
          </motion.div>
        </TabsContent>

        <TabsContent value='capture' keepMounted className='min-h-0 flex-1'>
          <motion.div
            className='h-full'
            initial={false}
            animate={activeTab === 'capture' ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={tweenFast}
          >
            <ScrollArea className='h-full'>
              <div className='flex flex-col gap-4 p-4'>
                <Section title='Capture an achievement'>
                  <AddAchievementForm />
                </Section>

                <Section title='Achievements'>
                  {achievements.length === 0 ? (
                    <p className='py-6 text-center text-sm text-muted-foreground'>
                      No pending achievements. Capture a win above.
                    </p>
                  ) : (
                    <div className='flex flex-col gap-3'>
                      {achievements.map((row) => (
                        <AchievementCard key={row.id} row={row} />
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            </ScrollArea>
          </motion.div>
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
