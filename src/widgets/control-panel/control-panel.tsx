'use client';

import { PanelRightIcon } from 'lucide-react';
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
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CvLibraryPanel } from '@/widgets/cv-library';

type Props = {
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
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

export function ControlPanel({
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
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
    <aside className='flex h-full min-h-0 flex-col overflow-hidden bg-card'>
      <Tabs value={activeTab} onValueChange={onTabChange} className='flex h-full min-h-0 flex-col gap-0'>
        <div className='flex h-[52px] shrink-0 items-center gap-1 border-b border-border bg-card px-2'>
          <TabsList className='min-w-0 flex-1' variant='line'>
            <TabsTrigger value='library'>Library</TabsTrigger>
            <TabsTrigger value='editor'>CV editor</TabsTrigger>
            <TabsTrigger value='style'>Style</TabsTrigger>
            <TabsTrigger value='capture'>Achievements</TabsTrigger>
          </TabsList>
          {onCollapse && (
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              onClick={onCollapse}
              aria-label='Collapse control panel'
            >
              <PanelRightIcon />
            </Button>
          )}
        </div>

        <TabsContent value='library' keepMounted className='min-h-0 flex-1'>
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
        </TabsContent>

        <TabsContent value='editor' keepMounted className='min-h-0 flex-1'>
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
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='style' keepMounted className='min-h-0 flex-1'>
          <ScrollArea className='h-full'>
            <div className='p-4'>
              <TemplatePicker
                template={template}
                accentHex={accentHex}
                educationDateFormat={educationDateFormat}
                certificationDateFormat={certificationDateFormat}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='capture' keepMounted className='min-h-0 flex-1'>
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
