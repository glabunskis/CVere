'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  deleteTailoredCvAction,
  renameTailoredCvAction,
} from '@/features/cv-library/actions/tailored-actions';
import type {
  CvLibraryData,
  TailoredCvSummary,
} from '@/features/cv-library/controllers/list-cvs';
import { usePreviewStore } from '@/features/previewer/stores/preview-store';

import { CvRow } from './cv-row';

type Props = {
  library: CvLibraryData;
};

export function CvLibraryPanel({ library }: Props) {
  const router = useRouter();
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const setPreviewTarget = usePreviewStore((s) => s.setPreviewTarget);
  const tailoredRows = library.tailored;
  const [pendingRename, setPendingRename] = useState<TailoredCvSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TailoredCvSummary | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const { execute: rename, isExecuting: renaming } = useAction(renameTailoredCvAction, {
    onSuccess: ({ data }) => {
      const row = data?.tailoredCv;
      if (!row) return;
      setPendingRename(null);
      setRenameTitle('');
      router.refresh();
      toast.success('Tailored CV renamed.');
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to rename tailored CV.');
    },
  });

  const { execute: remove, isExecuting: deleting } = useAction(deleteTailoredCvAction, {
    onSuccess: () => {
      if (!pendingDelete) return;
      const deletedId = pendingDelete.id;
      setPendingDelete(null);
      if (previewTarget.kind === 'tailored_cv' && previewTarget.refId === deletedId) {
        setPreviewTarget({ kind: 'master' });
      }
      router.refresh();
      toast.success('Tailored CV deleted.');
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to delete tailored CV.');
    },
  });

  return (
    <>
      <div className='flex flex-col gap-2'>
        <h4 className='text-sm font-medium text-foreground'>CVs</h4>

        <CvRow
          title={library.master.title}
          updatedAt={library.master.updatedAt}
          isActive={previewTarget.kind === 'master'}
          onOpen={() => setPreviewTarget({ kind: 'master' })}
        />

        {tailoredRows.length === 0 ? (
          <p className='rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground'>
            No tailored CVs yet. Ask chat to create one from a vacancy.
          </p>
        ) : (
          <div className='flex flex-col gap-1.5'>
            {tailoredRows.map((row) => (
              <CvRow
                key={row.id}
                title={row.title}
                meta={row.jobDescriptionLabel}
                updatedAt={row.updatedAt}
                isActive={previewTarget.kind === 'tailored_cv' && previewTarget.refId === row.id}
                onOpen={() => setPreviewTarget({ kind: 'tailored_cv', refId: row.id })}
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
                      <DropdownMenuItem variant='destructive' onClick={() => setPendingDelete(row)}>
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
            <DialogTitle>Rename tailored CV</DialogTitle>
            <DialogDescription>Use a short, descriptive title.</DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (!pendingRename) return;
              const next = renameTitle.trim();
              if (next.length === 0) return;
              rename({ tailoredCvId: pendingRename.id, title: next });
            }}
          >
            <Input
              autoFocus
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              maxLength={120}
              minLength={1}
              placeholder='Tailored CV title'
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
            <DialogTitle>Delete tailored CV?</DialogTitle>
            <DialogDescription>
              This removes the tailored CV and its cached PDF preview.
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
                remove({ tailoredCvId: pendingDelete.id });
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
