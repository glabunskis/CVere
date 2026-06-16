'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import type { CvLibraryData, CvLibraryItem } from '@/entities/cv/list-cv-library';
import {
  createCvAction,
  deleteCvAction,
  renameCvAction,
  setSelectedCvAction,
} from '@/features/cv-management';
import { usePreviewStore } from '@/features/cv-preview/preview-store';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/select';

import { CvRow } from './cv-row';

type Props = {
  library: CvLibraryData;
};

export function CvLibraryPanel({ library }: Props) {
  const router = useRouter();
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const setPreviewTarget = usePreviewStore((s) => s.setPreviewTarget);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);
  const [pendingRename, setPendingRename] = useState<CvLibraryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CvLibraryItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [sourceCvId, setSourceCvId] = useState('');

  const activeCvId = previewTarget?.cvId ?? library.selectedCvId ?? library.items[0]?.id ?? '';

  const { execute: rename, isExecuting: renaming } = useAction(renameCvAction, {
    onSuccess: ({ data }) => {
      const row = data?.cv;
      if (!row) return;
      setPendingRename(null);
      setRenameTitle('');
      router.refresh();
      toast.success('CV renamed.');
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to rename CV.');
    },
  });

  const { execute: remove, isExecuting: deleting } = useAction(deleteCvAction, {
    onSuccess: () => {
      if (!pendingDelete) return;
      setPendingDelete(null);
      router.refresh();
      toast.success('CV deleted.');
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to delete CV.');
    },
  });

  const { execute: selectCv } = useAction(setSelectedCvAction, {
    onSuccess: ({ data }) => {
      if (!data?.cvId) return;
      setPreviewTarget({ cvId: data.cvId });
      void markPreviewDirty();
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to switch CV.');
    },
  });

  const { execute: createCv, isExecuting: creating } = useAction(createCvAction, {
    onSuccess: ({ data }) => {
      const createdCvId = data?.cv?.id;
      if (createdCvId) {
        setPreviewTarget({ cvId: createdCvId });
        void markPreviewDirty();
      }
      setIsCreateOpen(false);
      setNewTitle('');
      setSourceCvId('');
      router.refresh();
      toast.success('CV created.');
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to create CV.');
    },
  });

  return (
    <>
      <div className='flex flex-col gap-2'>
        <Button
          type='button'
          size='sm'
          className='w-full justify-center shadow-[0_0_0_4px_var(--primary-soft)]'
          onClick={() => {
            setSourceCvId(activeCvId);
            setIsCreateOpen(true);
          }}
          disabled={library.items.length === 0}
        >
          <PlusIcon />
          New CV
        </Button>

        {library.items.length === 0 ? (
          <p className='rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground'>
            No CVs yet.
          </p>
        ) : (
          <div className='flex flex-col gap-1.5'>
            {library.items.map((row) => (
              <CvRow
                key={row.id}
                title={row.title}
                meta={row.jobDescriptionLabel}
                updatedAt={row.updatedAt}
                isActive={activeCvId === row.id}
                onOpen={() => selectCv({ cvId: row.id })}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button type='button' size='icon-xs' variant='ghost' />}
                      aria-label={`Actions for ${row.title}`}
                    >
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-44'>
                      <DropdownMenuItem
                        onClick={() => {
                          setPendingRename(row);
                          setRenameTitle(row.title);
                        }}
                      >
                        <PencilIcon />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant='destructive'
                        disabled={row.isDefault}
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingRename != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRename(null);
            setRenameTitle('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename CV</DialogTitle>
            <DialogDescription>Use a short, descriptive title.</DialogDescription>
          </DialogHeader>
          <form
            className='flex flex-col gap-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (!pendingRename) return;
              const next = renameTitle.trim();
              if (next.length === 0) return;
              rename({ cvId: pendingRename.id, title: next });
            }}
          >
            <Input
              autoFocus
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              maxLength={120}
              minLength={1}
              placeholder='CV title'
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setPendingRename(null);
                  setRenameTitle('');
                }}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={renaming || pendingRename == null || renameTitle.trim().length === 0}
              >
                {renaming ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete CV?</DialogTitle>
            <DialogDescription>
              This removes the CV and its cached PDF preview.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={deleting || pendingDelete == null}
              onClick={() => {
                if (!pendingDelete) return;
                remove({ cvId: pendingDelete.id });
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (open) return;
          setIsCreateOpen(false);
          setNewTitle('');
          setSourceCvId('');
        }}
      >
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
              <Select
                value={sourceCvId || activeCvId}
                onValueChange={(value) => setSourceCvId(value as string)}
              >
                <SelectTrigger className='w-full'>
                  {library.items.find((cv) => cv.id === (sourceCvId || activeCvId))?.title ?? ''}
                </SelectTrigger>
                <SelectContent>
                  {library.items.map((cv) => (
                    <SelectItem key={cv.id} value={cv.id}>
                      {cv.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setIsCreateOpen(false);
                  setNewTitle('');
                  setSourceCvId('');
                }}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={creating || newTitle.trim().length === 0}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
