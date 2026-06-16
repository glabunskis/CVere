'use client';

import { useRef, useState } from 'react';
import {
  BookOpenIcon,
  PaletteIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PenIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
} from 'lucide-react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

import type { AchievementRow } from '@/entities/achievement';
import type { CvRow } from '@/entities/cv/cv-service';
import type { ProfileChildren } from '@/entities/cv/get-cv-children';
import type { CvLibraryData } from '@/entities/cv/list-cv-library';
import { ChatPanel } from '@/features/chat/components/chat-panel';
import type { ChatSessionListItem, ChatUIMessage } from '@/features/chat/types';
import { PreviewerPane } from '@/features/cv-preview/previewer-pane';
import type { CvTemplate } from '@/features/cv-style';
import { cn } from '@/shared/lib/cn';
import { jsonToStringArray } from '@/shared/lib/cv-json';
import type { CvDateFormat } from '@/shared/lib/format-date';
import { Button } from '@/shared/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { ControlPanel } from '@/widgets/control-panel';

type Props = {
  selectedCvId: string;
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  experienceDateFormat: CvDateFormat;
  activeSessionId: string;
  sessions: ChatSessionListItem[];
  initialChatMessages: ChatUIMessage[];
  initialPrefill: string | null;
  cvLibrary: CvLibraryData;
  achievements: AchievementRow[];
  summary: string | null;
  contact: CvRow;
  fallbackEmail: string | null;
  fallbackFullName: string | null;
  sections: ProfileChildren;
};

const CONTROL_TABS = [
  { value: 'library', icon: BookOpenIcon, label: 'Library' },
  { value: 'editor', icon: PenIcon, label: 'CV editor' },
  { value: 'style', icon: PaletteIcon, label: 'Style' },
  { value: 'capture', icon: TrophyIcon, label: 'Achievements' },
] as const;

export function DashboardWorkspace({
  selectedCvId,
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
  experienceDateFormat,
  activeSessionId,
  sessions,
  initialChatMessages,
  initialPrefill,
  cvLibrary,
  achievements,
  summary,
  contact,
  fallbackEmail,
  fallbackFullName,
  sections,
}: Props) {
  const chatRef = useRef<PanelImperativeHandle | null>(null);
  const controlRef = useRef<PanelImperativeHandle | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [controlCollapsed, setControlCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('library');

  const toggleChat = () => {
    if (chatCollapsed) chatRef.current?.expand();
    else chatRef.current?.collapse();
  };

  const toggleControl = () => {
    if (controlCollapsed) controlRef.current?.expand();
    else controlRef.current?.collapse();
  };

  return (
    <ResizablePanelGroup orientation='horizontal' className='min-h-0'>
      {/* Chat panel — collapses to a ~56px icon rail */}
      <ResizablePanel
        id='chat'
        panelRef={chatRef}
        collapsible
        collapsedSize='56px'
        minSize={22}
        defaultSize={26}
        onResize={(size) => setChatCollapsed(size.inPixels <= 60)}
      >
        <div className='h-full min-h-0 overflow-hidden bg-card'>
          {chatCollapsed && (
            <div className='flex h-full flex-col items-center gap-1 py-2'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      aria-label='Expand chat panel'
                      onClick={() => chatRef.current?.expand()}
                    />
                  }
                >
                  <PanelRightIcon className='size-5' strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent side='right'>Expand chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      aria-label='New chat'
                      onClick={() => chatRef.current?.expand()}
                    />
                  }
                >
                  <PlusIcon className='size-5' strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent side='right'>New chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      aria-label='Chat assistant'
                      onClick={() => chatRef.current?.expand()}
                    />
                  }
                >
                  <SparklesIcon />
                </TooltipTrigger>
                <TooltipContent side='right'>Chat</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Keep ChatPanel mounted to preserve session/message state */}
          <div className={cn('h-full min-h-0', chatCollapsed && 'hidden')}>
            <ChatPanel
              initialActiveSessionId={activeSessionId}
              initialCvId={selectedCvId}
              sessions={sessions}
              initialMessages={initialChatMessages}
              initialPrefill={initialPrefill}
              onCollapse={toggleChat}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel id='preview' minSize={30} defaultSize={44}>
        <PreviewerPane
          selectedCvTitle={cvLibrary.items.find((item) => item.id === selectedCvId)?.title}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Control panel — collapses to a ~56px icon rail */}
      <ResizablePanel
        id='control'
        panelRef={controlRef}
        collapsible
        collapsedSize='56px'
        minSize={20}
        defaultSize={30}
        onResize={(size) => setControlCollapsed(size.inPixels <= 60)}
      >
        <div className='h-full min-h-0 overflow-hidden bg-card'>
          {controlCollapsed && (
            <div className='flex h-full flex-col items-center gap-1 py-2'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      aria-label='Expand control panel'
                      onClick={() => controlRef.current?.expand()}
                    />
                  }
                >
                  <PanelLeftIcon className='size-5' strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent side='left'>Expand panel</TooltipContent>
              </Tooltip>

              <div className='my-1 w-6 border-t border-border' />

              {CONTROL_TABS.map(({ value, icon: Icon, label }) => (
                <Tooltip key={value}>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        size='icon-sm'
                        variant='ghost'
                        className={cn(activeTab === value && 'bg-primary-soft')}
                        aria-label={label}
                        onClick={() => {
                          setActiveTab(value);
                          controlRef.current?.expand();
                        }}
                      />
                    }
                  >
                    <Icon className='size-5' strokeWidth={2} />
                  </TooltipTrigger>
                  <TooltipContent side='left'>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Keep ControlPanel mounted to preserve form state */}
          <div className={cn('h-full min-h-0', controlCollapsed && 'hidden')}>
            <ControlPanel
              template={template}
              accentHex={accentHex}
              educationDateFormat={educationDateFormat}
              certificationDateFormat={certificationDateFormat}
              experienceDateFormat={experienceDateFormat}
              cvLibrary={cvLibrary}
              achievements={achievements}
              summary={summary}
              contact={contact}
              fallbackEmail={fallbackEmail}
              fallbackFullName={fallbackFullName}
              sections={sections}
              skillCategories={jsonToStringArray(contact.skill_categories)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCollapse={toggleControl}
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
