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
import {
  AnimatePresence,
  listContainer,
  listItem,
  motion,
  MotionConfig,
} from '@/shared/lib/motion';
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

// Collapsed icon-rail width.
const RAIL_SIZE = '56px';
// Fixed minimum widths (the drag floor). Dragging resists here; the panel only
// collapses once dragged past the midpoint between RAIL_SIZE and the min — i.e.
// noticeably closer to the edge. Raise the min to widen the floor (which also
// pushes the collapse point further from the edge, since the library uses the
// midpoint); lower it to let the panel get narrower and collapse nearer the edge.
const CHAT_MIN_WIDTH = '320px';
const CONTROL_MIN_WIDTH = '340px';
const PREVIEW_MIN_WIDTH = '360px';

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
  const animateTimers = useRef<number[]>([]);
  // Synchronous mirror of `animatingPanels` so onResize (which can fire before a
  // state update commits) can tell a programmatic tween from a manual drag.
  const animatingRef = useRef(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [controlCollapsed, setControlCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [animatingPanels, setAnimatingPanels] = useState(false);
  // When set, the panel's content keeps this fixed pixel width and is clipped by
  // the parent's overflow-hidden, so it stays visually the same size (no shrug)
  // while the panel width tweens. Released to null after the animation.
  const [chatContentWidth, setChatContentWidth] = useState<number | null>(null);
  const [controlContentWidth, setControlContentWidth] = useState<number | null>(null);
  // Drives the content fade independently of the width tween so the two phases
  // can be sequenced (fade out -> collapse; expand -> fade in).
  const [chatContentVisible, setChatContentVisible] = useState(true);
  const [controlContentVisible, setControlContentVisible] = useState(true);

  // Width tween duration (ms). Kept in sync with the CSS duration below.
  const PANEL_ANIM_MS = 400;
  // Content fade duration (ms). Kept in sync with the Motion transition below.
  const FADE_MS = 150;

  const setAnimating = (value: boolean) => {
    animatingRef.current = value;
    setAnimatingPanels(value);
  };
  const clearAnimateTimers = () => {
    for (const t of animateTimers.current) window.clearTimeout(t);
    animateTimers.current = [];
  };
  // Sync content state to the live size when the change is a manual drag (not a
  // programmatic tween). Without this, dragging open a button-collapsed panel
  // leaves the content stuck faded out.
  const syncPanelToDrag = (panel: 'chat' | 'control', collapsed: boolean) => {
    if (animatingRef.current) return;
    clearAnimateTimers();
    if (panel === 'chat') {
      setChatContentWidth(null);
      setChatContentVisible(!collapsed);
    } else {
      setControlContentWidth(null);
      setControlContentVisible(!collapsed);
    }
  };
  const later = (fn: () => void, ms: number) => {
    animateTimers.current.push(window.setTimeout(fn, ms));
  };

  // Sequenced collapse/expand:
  // - Collapse: fade content out first (at full width, pinned so it can't deform),
  //   THEN tween the width down with the content already gone.
  // - Expand: tween the width open first while the content stays invisible (it
  //   reflows to full width unseen), THEN fade it back in already-full ("show only
  //   once opened") so there is no size snap.
  const animatePanel = (panel: 'chat' | 'control', collapse: boolean) => {
    const ref = panel === 'chat' ? chatRef : controlRef;
    const setPin = panel === 'chat' ? setChatContentWidth : setControlContentWidth;
    const setVisible = panel === 'chat' ? setChatContentVisible : setControlContentVisible;

    clearAnimateTimers();

    if (collapse) {
      const current = ref.current?.getSize().inPixels ?? 0;
      if (current > 60) setPin(current);
      setVisible(false);
      later(() => {
        setAnimating(true);
        requestAnimationFrame(() => ref.current?.collapse());
        later(() => {
          setAnimating(false);
          setPin(null);
        }, PANEL_ANIM_MS + 60);
      }, FADE_MS);
    } else {
      // No width pin on expand: the content is hidden while the panel opens, so it
      // reaches full width before it ever becomes visible.
      setPin(null);
      setAnimating(true);
      requestAnimationFrame(() => ref.current?.expand());
      later(() => {
        setAnimating(false);
        setVisible(true);
      }, PANEL_ANIM_MS + 40);
    }
  };

  const expandChat = () => animatePanel('chat', false);
  const expandControl = () => animatePanel('control', false);
  const toggleChat = () => animatePanel('chat', !chatCollapsed);
  const toggleControl = () => animatePanel('control', !controlCollapsed);

  return (
    <ResizablePanelGroup
      orientation='horizontal'
      className={cn(
        'min-h-0',
        animatingPanels &&
          '[&_[data-panel]]:transition-[flex-grow] [&_[data-panel]]:duration-[400ms] [&_[data-panel]]:ease-[cubic-bezier(0.16,1,0.3,1)]',
      )}
    >
      {/* Chat panel — collapses to a ~56px icon rail */}
      <ResizablePanel
        id='chat'
        panelRef={chatRef}
        collapsible
        collapsedSize={RAIL_SIZE}
        minSize={CHAT_MIN_WIDTH}
        defaultSize={26}
        onResize={(size) => {
          const collapsed = size.inPixels <= 60;
          setChatCollapsed(collapsed);
          syncPanelToDrag('chat', collapsed);
        }}
      >
        <div className='relative h-full min-h-0 overflow-hidden bg-card'>
          <AnimatePresence>
            {chatCollapsed && (
              <motion.div
                key='chat-rail'
                className='absolute inset-0 z-10 flex flex-col items-center gap-1 bg-card py-2'
                variants={listContainer}
                initial='hidden'
                animate='visible'
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <motion.div variants={listItem}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          size='icon-sm'
                          variant='ghost'
                          aria-label='Expand chat panel'
                          onClick={expandChat}
                        />
                      }
                    >
                      <PanelRightIcon className='size-5' strokeWidth={2} />
                    </TooltipTrigger>
                    <TooltipContent side='right'>Expand chat</TooltipContent>
                  </Tooltip>
                </motion.div>

                <motion.div variants={listItem}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          size='icon-sm'
                          variant='ghost'
                          aria-label='New chat'
                          onClick={expandChat}
                        />
                      }
                    >
                      <PlusIcon className='size-5' strokeWidth={2} />
                    </TooltipTrigger>
                    <TooltipContent side='right'>New chat</TooltipContent>
                  </Tooltip>
                </motion.div>

                <motion.div variants={listItem}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          size='icon-sm'
                          variant='ghost'
                          aria-label='Chat assistant'
                          onClick={expandChat}
                        />
                      }
                    >
                      <SparklesIcon />
                    </TooltipTrigger>
                    <TooltipContent side='right'>Chat</TooltipContent>
                  </Tooltip>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keep ChatPanel mounted to preserve session/message state. Pin the
              width during the tween so the content is clipped, not reflowed. */}
          <MotionConfig reducedMotion='never'>
            <motion.div
              className={cn('h-full min-h-0', chatCollapsed && !animatingPanels && 'hidden')}
              style={chatContentWidth != null ? { width: chatContentWidth } : undefined}
              animate={{ opacity: chatContentVisible ? 1 : 0 }}
              transition={{ duration: FADE_MS / 1000, ease: 'easeOut' }}
            >
              <ChatPanel
                initialActiveSessionId={activeSessionId}
                initialCvId={selectedCvId}
                sessions={sessions}
                initialMessages={initialChatMessages}
                initialPrefill={initialPrefill}
                onCollapse={toggleChat}
              />
            </motion.div>
          </MotionConfig>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel id='preview' minSize={PREVIEW_MIN_WIDTH} defaultSize={44}>
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
        collapsedSize={RAIL_SIZE}
        minSize={CONTROL_MIN_WIDTH}
        defaultSize={30}
        onResize={(size) => {
          const collapsed = size.inPixels <= 60;
          setControlCollapsed(collapsed);
          syncPanelToDrag('control', collapsed);
        }}
      >
        <div className='relative h-full min-h-0 overflow-hidden bg-card'>
          <AnimatePresence>
            {controlCollapsed && (
              <motion.div
                key='control-rail'
                className='absolute inset-0 z-10 flex flex-col items-center gap-1 bg-card py-2'
                variants={listContainer}
                initial='hidden'
                animate='visible'
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <motion.div variants={listItem}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          size='icon-sm'
                          variant='ghost'
                          aria-label='Expand control panel'
                          onClick={expandControl}
                        />
                      }
                    >
                      <PanelLeftIcon className='size-5' strokeWidth={2} />
                    </TooltipTrigger>
                    <TooltipContent side='left'>Expand panel</TooltipContent>
                  </Tooltip>
                </motion.div>

                <div className='my-1 w-6 border-t border-border' />

                {CONTROL_TABS.map(({ value, icon: Icon, label }) => (
                  <motion.div key={value} variants={listItem}>
                    <Tooltip>
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
                              expandControl();
                            }}
                          />
                        }
                      >
                        <Icon className='size-5' strokeWidth={2} />
                      </TooltipTrigger>
                      <TooltipContent side='left'>{label}</TooltipContent>
                    </Tooltip>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keep ControlPanel mounted to preserve form state. Pin the width
              during the tween so the content is clipped, not reflowed. */}
          <MotionConfig reducedMotion='never'>
            <motion.div
              className={cn('h-full min-h-0', controlCollapsed && !animatingPanels && 'hidden')}
              style={controlContentWidth != null ? { width: controlContentWidth } : undefined}
              animate={{ opacity: controlContentVisible ? 1 : 0 }}
              transition={{ duration: FADE_MS / 1000, ease: 'easeOut' }}
            >
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
            </motion.div>
          </MotionConfig>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
