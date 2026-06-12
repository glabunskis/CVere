import { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { APP_DESCRIPTION, APP_DISPLAY_NAME } from '@/shared/config';
import { Logo } from '@/shared/ui/logo';
import { Toaster } from '@/shared/ui/sonner';
import { Analytics } from '@vercel/analytics/react';

import { Navigation } from './navigation';

import '@/styles/globals.css';

const geistSans = Geist({
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
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Browser extensions (Urban VPN, Grammarly, password managers, etc.)
          inject attributes/elements into <body> before React hydrates, which
          would otherwise throw a hydration mismatch (#418) in production and
          tear down the subtree — breaking live UI like chat streaming. This
          tolerates body-level injection only (one level deep). */}
      <body className='flex min-h-full flex-col' suppressHydrationWarning>
        <NuqsAdapter>
          <div className='m-auto flex w-full max-w-5xl flex-1 flex-col px-4'>
            <AppBar />
            <main className='relative flex-1'>
              <div className='relative h-full'>{children}</div>
            </main>
            <Footer />
          </div>
          <Toaster />
          <Analytics />
        </NuqsAdapter>
      </body>
    </html>
  );
}

async function AppBar() {
  return (
    <header className='flex items-center justify-between py-6'>
      <Logo />
      <Navigation />
    </header>
  );
}

function Footer() {
  return (
    <footer className='mt-16 border-t py-8 text-center text-sm text-muted-foreground'>
      <p>
        &copy; {new Date().getFullYear()} {APP_DISPLAY_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
