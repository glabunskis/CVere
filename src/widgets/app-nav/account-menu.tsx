'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { CircleUser } from 'lucide-react';
import { toast } from 'sonner';

import { signOut } from '@/features/auth/auth-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

export function AccountMenu() {
  const router = useRouter();

  const { execute } = useAction(signOut, {
    onSuccess: () => {
      router.refresh();
      toast('You have been logged out.');
    },
    onError: () => {
      toast.error('An error occurred while logging out. Please try again or contact support.');
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='rounded-full'>
        <CircleUser size={24} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='me-4'>
        <DropdownMenuItem render={<Link href='/account' />}>Account</DropdownMenuItem>
        <DropdownMenuItem onClick={() => execute()}>Log Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
