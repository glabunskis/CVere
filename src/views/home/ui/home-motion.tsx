'use client';

import type { ReactNode } from 'react';

import { fadeSlideUp, listContainer, listItem, motion } from '@/shared/lib/motion';

const viewport = { once: true, margin: '-80px' } as const;

type WrapperProps = {
  className?: string;
  children: ReactNode;
};

/** Scroll-reveal section: fades + slides up the first time it enters the viewport. */
export function RevealSection({ className, children }: WrapperProps) {
  return (
    <motion.section
      className={className}
      variants={fadeSlideUp}
      initial='hidden'
      whileInView='visible'
      viewport={viewport}
    >
      {children}
    </motion.section>
  );
}

/** Scroll-reveal stagger container. Wrap `RevealItem` children. */
export function RevealGrid({ className, children }: WrapperProps) {
  return (
    <motion.div
      className={className}
      variants={listContainer}
      initial='hidden'
      whileInView='visible'
      viewport={viewport}
    >
      {children}
    </motion.div>
  );
}

/** Stagger child for `RevealGrid`. Inherits visible/hidden state from the container. */
export function RevealItem({ className, children }: WrapperProps) {
  return (
    <motion.div className={className} variants={listItem}>
      {children}
    </motion.div>
  );
}
