'use client';

import { MotionConfig } from '@/shared/lib/motion';

/**
 * Global reduced-motion guarantee for the entire app.
 * Wraps MotionConfig with reducedMotion="user" so all Motion animations
 * automatically respect the OS "Reduce Motion" preference without each
 * component needing its own check.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion='user'>{children}</MotionConfig>;
}
