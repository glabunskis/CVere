'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { Redo2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { usePreviewStore } from '@/features/cv-preview/preview-store';
import { motion, tweenFast } from '@/shared/lib/motion';
import { Button } from '@/shared/ui/button';

import {
  getCvHistoryStateAction,
  redoCvAction,
  undoCvAction,
} from './cv-history-actions';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function HistoryControls() {
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const historyTick = usePreviewStore((s) => s.historyTick);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);
  const router = useRouter();

  const cvId = previewTarget?.cvId ?? null;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { executeAsync: fetchState } = useAction(getCvHistoryStateAction);

  const onMutated = (result: { canUndo: boolean; canRedo: boolean }) => {
    setCanUndo(result.canUndo);
    setCanRedo(result.canRedo);
    void markPreviewDirty();
    router.refresh();
  };

  const { execute: undo, isExecuting: undoing } = useAction(undoCvAction, {
    onSuccess: ({ data }) => {
      if (data) onMutated(data);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Undo failed'),
  });

  const { execute: redo, isExecuting: redoing } = useAction(redoCvAction, {
    onSuccess: ({ data }) => {
      if (data) onMutated(data);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Redo failed'),
  });

  useEffect(() => {
    if (!cvId) return;
    let active = true;
    void fetchState({ cvId }).then((result) => {
      if (!active) return;
      if (result?.data) {
        setCanUndo(result.data.canUndo);
        setCanRedo(result.data.canRedo);
      }
    });
    return () => {
      active = false;
    };
  }, [cvId, historyTick, fetchState]);

  useEffect(() => {
    if (!cvId) return;
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      const isUndo = key === 'z' && !event.shiftKey;
      if (isRedo) {
        if (!canRedo || redoing) return;
        event.preventDefault();
        redo({ cvId });
      } else if (isUndo) {
        if (!canUndo || undoing) return;
        event.preventDefault();
        undo({ cvId });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cvId, canUndo, canRedo, undoing, redoing, undo, redo]);

  return (
    <div className='flex items-center gap-1'>
      <motion.div whileTap={{ scale: 0.92 }} transition={tweenFast} className='inline-flex'>
        <Button
          size='sm'
          variant='outline'
          aria-label='Undo'
          title='Undo (Ctrl+Z)'
          disabled={!cvId || !canUndo || undoing}
          onClick={() => {
            if (cvId) undo({ cvId });
          }}
        >
          <Undo2 className='size-4' />
        </Button>
      </motion.div>
      <motion.div whileTap={{ scale: 0.92 }} transition={tweenFast} className='inline-flex'>
        <Button
          size='sm'
          variant='outline'
          aria-label='Redo'
          title='Redo (Ctrl+Shift+Z)'
          disabled={!cvId || !canRedo || redoing}
          onClick={() => {
            if (cvId) redo({ cvId });
          }}
        >
          <Redo2 className='size-4' />
        </Button>
      </motion.div>
    </div>
  );
}
