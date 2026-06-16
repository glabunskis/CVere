'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';

import { createCvAction, setSelectedCvAction } from '@/features/cv-management';
import { usePreviewStore } from '@/features/cv-preview/preview-store';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

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
  const activeCvTitle = cvs.find((cv) => cv.id === activeCvId)?.title ?? 'My CV';

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
      <nav className='flex items-center gap-4 overflow-x-auto py-1.5 pr-1.5'>
        <div className='flex items-center gap-1 overflow-x-auto'>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border-b-2 px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {shouldShowCvSelector && cvs.length > 0 ? (
          <div className='flex items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={switchingCv}
                className={cn(
                  'flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 text-sm transition-colors',
                  'hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  switchingCv && 'pointer-events-none opacity-50',
                )}
              >
                <span className='size-2 shrink-0 rounded-full bg-primary' />
                <span className='max-w-[140px] truncate font-medium text-foreground'>
                  {activeCvTitle}
                </span>
                <span className='shrink-0 font-mono text-xs text-muted-foreground'>
                  {activeCvId.slice(0, 8)}
                </span>
                <ChevronDownIcon className='size-3 shrink-0 text-muted-foreground' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='min-w-[240px]'>
                {cvs.map((cv) => (
                  <DropdownMenuItem
                    key={cv.id}
                    onClick={() => {
                      if (cv.id === activeCvId) return;
                      selectCv({ cvId: cv.id });
                    }}
                  >
                    <span
                      className={cn('flex-1 truncate', cv.id === activeCvId && 'font-medium')}
                    >
                      {cv.title}
                    </span>
                    {cv.id === activeCvId && (
                      <CheckIcon className='ml-2 size-3 shrink-0 opacity-60' />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type='button'
              className='shadow-[0_0_0_4px_var(--primary-soft)]'
              onClick={() => setIsCreateOpen(true)}
            >
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
            className='flex flex-col gap-4'
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
            <div className='flex flex-col gap-2'>
              <p className='text-xs font-medium text-muted-foreground'>Title</p>
              <Input
                autoFocus
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder='Backend CV'
                maxLength={120}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-xs font-medium text-muted-foreground'>Source CV</p>
              <Select value={sourceCvId || activeCvId} onChange={(event) => setSourceCvId(event.target.value)}>
                {cvs.map((cv) => (
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
