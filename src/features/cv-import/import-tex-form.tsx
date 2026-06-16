'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';

import { importTex } from './import-tex';

type Mode = 'append' | 'replace';

const MAX_FILE_BYTES = 500_000;

const SELECTED_MODE_CLASS =
  'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground';

export function ImportTexForm() {
  const [mode, setMode] = useState<Mode>('append');
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [stagedFiles, setStagedFiles] = useState<{ name: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const { execute, isExecuting } = useAction(importTex, {
    onSuccess: ({ data }) => {
      const counts = data?.counts;
      const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
      toast.success(
        `Imported ${total} item${total === 1 ? '' : 's'}${data?.summaryUpdated ? ' + summary' : ''}.`,
      );
      for (const w of data?.warnings ?? []) {
        toast.warning(w);
      }
      setPickedNames([]);
      setStagedFiles([]);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to import'),
  });

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const collected: { name: string; content: string }[] = [];
      const names: string[] = [];

      for (const file of Array.from(fileList)) {
        names.push(file.name);
        if (file.name.toLowerCase().endsWith('.zip')) {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(await file.arrayBuffer());
          const entries = Object.values(zip.files).filter(
            (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.tex'),
          );
          for (const entry of entries) {
            const content = await entry.async('string');
            if (content.length > MAX_FILE_BYTES) {
              toast.warning(`Skipped ${entry.name}: exceeds ${MAX_FILE_BYTES} bytes.`);
              continue;
            }
            collected.push({ name: entry.name, content });
          }
        } else if (file.name.toLowerCase().endsWith('.tex')) {
          if (file.size > MAX_FILE_BYTES) {
            toast.warning(`Skipped ${file.name}: exceeds ${MAX_FILE_BYTES} bytes.`);
            continue;
          }
          collected.push({ name: file.name, content: await file.text() });
        }
      }

      if (collected.length === 0) {
        toast.error('No .tex files found in upload.');
      }

      setPickedNames(names);
      setStagedFiles(collected);
    } catch (err) {
      console.error(err);
      toast.error('Failed to read upload.');
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (stagedFiles.length === 0) {
      toast.error('Pick a .tex file or .zip first.');
      return;
    }
    if (mode === 'replace' && !confirm('Replace mode wipes current experience, projects, skills, education, certifications, and languages. Continue?')) {
      return;
    }
    execute({ files: stagedFiles, mode });
  }

  const disabled = busy || isExecuting;

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-dashed border-border-strong p-3'>
      <div className='flex flex-col gap-1'>
        <Label className='text-sm font-medium'>Import CV (.tex)</Label>
        <p className='text-xs text-muted-foreground'>
          Upload one or more .tex files (root + elements) or a .zip with the same layout as the Examples folder.
        </p>
      </div>

      <input
        type='file'
        accept='.tex,.zip,application/zip'
        multiple
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        className='block w-full text-xs file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-foreground'
      />

      {pickedNames.length > 0 ? (
        <p className='text-xs text-muted-foreground'>
          Staged {stagedFiles.length} .tex file{stagedFiles.length === 1 ? '' : 's'} from {pickedNames.length} upload
          {pickedNames.length === 1 ? '' : 's'}.
        </p>
      ) : null}

      <div className='flex items-center gap-2'>
        <span className='text-xs text-muted-foreground'>Mode:</span>
        <ToggleGroup variant='outline' size='sm' spacing={0}>
          <ToggleGroupItem
            pressed={mode === 'append'}
            onPressedChange={(next) => { if (next) setMode('append'); }}
            disabled={disabled}
            className={SELECTED_MODE_CLASS}
          >
            Append
          </ToggleGroupItem>
          <ToggleGroupItem
            pressed={mode === 'replace'}
            onPressedChange={(next) => { if (next) setMode('replace'); }}
            disabled={disabled}
            className={SELECTED_MODE_CLASS}
          >
            Replace
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Button size='sm' onClick={submit} disabled={disabled || stagedFiles.length === 0}>
        {isExecuting ? 'Importing...' : 'Import'}
      </Button>
    </div>
  );
}
