'use client';

import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

import { useHasMounted } from '@/shared/lib/use-has-mounted';
import { Button } from '@/shared/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hasMounted = useHasMounted();

  // Before mount: default to SunIcon (dark is the app default, Sun shows in dark).
  // After mount: Sun in dark mode (click → light), Moon in light mode (click → dark).
  const Icon = hasMounted && resolvedTheme !== 'dark' ? MoonIcon : SunIcon;

  return (
    <Button
      variant='ghost'
      size='icon-sm'
      aria-label='Toggle theme'
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Icon />
    </Button>
  );
}
