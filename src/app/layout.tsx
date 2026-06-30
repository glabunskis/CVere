import { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { APP_DESCRIPTION, APP_DISPLAY_NAME } from '@/shared/config';
import { Logo } from '@/shared/ui/logo';
import { MotionProvider } from '@/shared/ui/motion-provider';
import { Toaster } from '@/shared/ui/sonner';
import { ThemeProvider } from '@/shared/ui/theme-provider';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Analytics } from '@vercel/analytics/react';

import { HeaderGate } from './header-gate';
import { Navigation } from './navigation';

import '@/styles/globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className='flex h-dvh flex-col'>
        <ThemeProvider attribute='class' defaultTheme='dark' enableSystem={false} disableTransitionOnChange>
          <MotionProvider>
            <NuqsAdapter>
              <TooltipProvider>
                <div className='flex h-full w-full flex-col'>
                  <HeaderGate>
                    <AppBar />
                  </HeaderGate>
                  <main className='relative flex min-h-0 flex-1 flex-col overflow-y-auto'>{children}</main>
                  <Footer />
                </div>
              </TooltipProvider>
              <Toaster />
              <Analytics />
            </NuqsAdapter>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function AppBar() {
  return (
    <header className='flex shrink-0 items-center justify-between px-4 py-3'>
      <Logo />
      <Navigation />
    </header>
  );
}

function Footer() {
  return (
    <footer className='shrink-0 border-t px-4 py-3 text-center text-sm text-muted-foreground'>
      <p>
        &copy; {new Date().getFullYear()} {APP_DISPLAY_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
