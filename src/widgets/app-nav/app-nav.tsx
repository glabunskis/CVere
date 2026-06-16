'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';

import { setSelectedCvAction } from '@/features/cv-management';
import { usePreviewStore } from '@/features/cv-preview/preview-store';
import { cn } from '@/shared/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

type NavItem = {
  href: string;
  label: string;
};

const items: NavItem[] = [
  { href: '/dashboard', label: 'Previewer' },
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
  const shouldShowCvSelector = pathname.startsWith('/dashboard');

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

  return (
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
            <span className='max-w-[180px] truncate font-medium text-foreground'>
              {activeCvTitle}
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
                <span className={cn('flex-1 truncate', cv.id === activeCvId && 'font-medium')}>
                  {cv.title}
                </span>
                {cv.id === activeCvId && <CheckIcon className='ml-2 size-3 shrink-0 opacity-60' />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
