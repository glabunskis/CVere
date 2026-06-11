import { type NextRequest } from 'next/server';

import { updateSession } from '@/shared/api/supabase/supabase-middleware-client';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const proxyConfig = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (route handlers; they authenticate themselves and must not sit
     *   behind the edge middleware layer, which buffers streamed responses —
     *   this is what made /api/chat deliver its SSE stream in one chunk on
     *   Vercel while it streamed fine locally)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
