import path from 'node:path';

import { Font, StyleSheet } from '@react-pdf/renderer';

export const DEFAULT_ACCENT = '#0066CC';
const LATIN_MODERN_ROMAN = 'Latin Modern Roman';
const lmFamily = path.join(process.cwd(), 'src', 'entities', 'cv', 'pdf', 'fonts', 'lm_roman');

// React-PDF's Font.register() appends sources to a family on every call; in
// Next.js dev that means HMR reloads accumulate stale entries and the first
// registration always wins exact-weight matches. Drop the family before
// re-registering so the latest mapping takes effect.
const registeredFamilies = Font.getRegisteredFonts() as Record<string, unknown>;
delete registeredFamilies[LATIN_MODERN_ROMAN];

Font.register({
  family: LATIN_MODERN_ROMAN,
  fonts: [
    { src: path.join(lmFamily, 'lmroman10-regular.otf'), fontWeight: 'normal' },
    { src: path.join(lmFamily, 'lmroman10-italic.otf'), fontWeight: 'normal', fontStyle: 'italic' },
    { src: path.join(lmFamily, 'lmroman10-bold.otf'), fontWeight: 'bold' },
    { src: path.join(lmFamily, 'lmroman10-bolditalic.otf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

export const pdfTheme = {
  page: {
    size: 'A4' as const,
    margin: 36,
  },
  colors: {
    text: '#1a1a1a',
    muted: '#666666',
    border: '#e5e5e5',
  },
  type: {
    family: LATIN_MODERN_ROMAN,
    sizes: {
      title: 18,
      h1: 14,
      h2: 11,
      body: 10,
      small: 9,
    },
  },
};

export type PdfStyles = ReturnType<typeof createStyles>;

export function createStyles(accent: string = DEFAULT_ACCENT) {
  return StyleSheet.create({
    page: {
      paddingTop: pdfTheme.page.margin,
      paddingBottom: pdfTheme.page.margin,
      paddingLeft: pdfTheme.page.margin,
      paddingRight: pdfTheme.page.margin,
      fontFamily: pdfTheme.type.family,
      fontSize: pdfTheme.type.sizes.body,
      color: pdfTheme.colors.text,
      lineHeight: 1.15,
    },
    title: {
      fontSize: pdfTheme.type.sizes.title,
      fontWeight: 'bold',
      color: pdfTheme.colors.text,
      lineHeight: 1,
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: pdfTheme.type.sizes.small,
      color: pdfTheme.colors.muted,
      marginBottom: 6,
      textAlign: 'center',
    },
    headerContactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      rowGap: 2,
    },
    headerContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerContactIcon: {
      marginRight: 3,
    },
    headerContactText: {
      fontSize: pdfTheme.type.sizes.small,
      color: pdfTheme.colors.text,
    },
    headerContactLink: {
      fontSize: pdfTheme.type.sizes.small,
      color: accent,
      textDecoration: 'none',
    },
    headerContactSeparator: {
      fontSize: pdfTheme.type.sizes.small,
      color: pdfTheme.colors.muted,
      marginHorizontal: 5,
    },
    headerRule: {
      marginTop: 4,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: accent,
    },
    sectionTitle: {
      fontSize: pdfTheme.type.sizes.h1,
      fontWeight: 'bold',
      color: accent,
      marginTop: 6,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 7,
    },
    itemTitle: {
      fontSize: pdfTheme.type.sizes.h2,
      fontWeight: 'bold',
    },
    itemMeta: {
      fontSize: pdfTheme.type.sizes.small,
      color: pdfTheme.colors.muted,
      marginBottom: 1,
    },
    dateMeta: {
      fontStyle: 'italic',
    },
    paragraph: {
      marginBottom: 2,
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: 1,
    },
    bulletDot: {
      width: 8,
      fontSize: pdfTheme.type.sizes.body,
      color: pdfTheme.colors.text,
    },
    bulletText: {
      flex: 1,
    },
    group: {
      marginBottom: 6,
    },
    itemGroup: {
      marginBottom: 3,
    },
    inlineMuted: {
      color: pdfTheme.colors.muted,
    },
    letterBody: {
      marginTop: 8,
    },
    twoColumnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    columnLeft: {
      flex: 1,
    },
    columnRight: {
      flex: 1,
    },
    accentLink: {
      color: accent,
      textDecoration: 'none',
    },
  });
}

// Backwards-compat: a default-accent stylesheet used by primitives that don't
// receive a styles object. Templates pass their own per-render styles instead.
export const styles = createStyles();
