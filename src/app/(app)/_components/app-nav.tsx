'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createCvAction, setSelectedCvAction } from '@/features/cv/actions/cv-actions';
import { usePreviewStore } from '@/features/previewer/stores/preview-store';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

const items: NavItem[] = [
  { href: '/dashboard', label: 'Previewer' },
  { href: '/profile', label: 'CV editor' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/vacancies', label: 'Vacancies' },
];

type CvOption = { id: string; title: string };

type Props = {
  cvs: CvOption[];
  selectedCvId: string | null;
};

export function AppNav({ cvs, selectedCvId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [sourceCvId, setSourceCvId] = useState<string>('');
  const shouldShowCvSelector = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');

  const activeCvId = selectedCvId ?? cvs[0]?.id ?? '';
  const sourceOptions = useMemo(() => cvs, [cvs]);

  const { execute: selectCv, isExecuting: switchingCv } = useAction(setSelectedCvAction, {
    onSuccess: ({ input }) => {
      const nextCvId = input?.cvId;
      if (nextCvId) {
        const previewStore = usePreviewStore.getState();
        previewStore.setPreviewTarget({ cvId: nextCvId });
        void previewStore.markPreviewDirty();
      }
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to switch CV.'),
  });

  const { execute: createCv, isExecuting: creatingCv } = useAction(createCvAction, {
    onSuccess: ({ data }) => {
      const createdCvId = data?.cv?.id;
      if (createdCvId) {
        const previewStore = usePreviewStore.getState();
        previewStore.setPreviewTarget({ cvId: createdCvId });
        void previewStore.markPreviewDirty();
      }
      setIsCreateOpen(false);
      setNewTitle('');
      setSourceCvId('');
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to create CV.'),
  });

  return (
    <>
      <nav className='flex w-full items-center justify-between gap-4 overflow-x-auto pb-1'>
        <div className='flex items-center gap-1 overflow-x-auto'>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {shouldShowCvSelector && cvs.length > 0 ? (
          <div className='flex min-w-[280px] items-center gap-2'>
            <Select
              value={activeCvId}
              disabled={switchingCv}
              onChange={(event) => {
                const cvId = event.target.value;
                if (!cvId || cvId === activeCvId) return;
                selectCv({ cvId });
              }}
            >
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title}
                </option>
              ))}
            </Select>
            <Button type='button' variant='outline' onClick={() => setIsCreateOpen(true)}>
              New CV
            </Button>
          </div>
        ) : null}
      </nav>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CV</DialogTitle>
            <DialogDescription>
              New CVs are copied from a source CV, then set as selected.
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              const title = newTitle.trim();
              if (title.length === 0) return;
              createCv({
                title,
                sourceCvId: (sourceCvId || activeCvId || null) || null,
              });
            }}
          >
            <div className='space-y-2'>
              <p className='text-xs font-medium text-muted-foreground'>Title</p>
              <Input
                autoFocus
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder='Backend CV'
                maxLength={120}
              />
            </div>
            <div className='space-y-2'>
              <p className='text-xs font-medium text-muted-foreground'>Source CV</p>
              <Select value={sourceCvId || activeCvId} onChange={(event) => setSourceCvId(event.target.value)}>
                {sourceOptions.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title}
                  </option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={creatingCv || newTitle.trim().length === 0}>
                {creatingCv ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
