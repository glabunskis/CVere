import { StyleSheet } from '@react-pdf/renderer';

export const pdfTheme = {
  page: {
    size: 'A4' as const,
    margin: 36,
  },
  colors: {
    text: '#1a1a1a',
    muted: '#666666',
    accent: '#1f4d8a',
    border: '#e5e5e5',
  },
  type: {
    family: 'Helvetica' as const,
    sizes: {
      title: 18,
      h1: 14,
      h2: 11,
      body: 10,
      small: 9,
    },
  },
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: pdfTheme.page.margin,
    paddingBottom: pdfTheme.page.margin,
    paddingLeft: pdfTheme.page.margin,
    paddingRight: pdfTheme.page.margin,
    fontFamily: pdfTheme.type.family,
    fontSize: pdfTheme.type.sizes.body,
    color: pdfTheme.colors.text,
    lineHeight: 1.4,
  },
  title: {
    fontSize: pdfTheme.type.sizes.title,
    fontWeight: 700,
    color: pdfTheme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: pdfTheme.type.sizes.small,
    color: pdfTheme.colors.muted,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: pdfTheme.type.sizes.h1,
    fontWeight: 700,
    color: pdfTheme.colors.accent,
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.border,
    paddingBottom: 2,
  },
  itemTitle: {
    fontSize: pdfTheme.type.sizes.h2,
    fontWeight: 700,
  },
  itemMeta: {
    fontSize: pdfTheme.type.sizes.small,
    color: pdfTheme.colors.muted,
    marginBottom: 3,
  },
  paragraph: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
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
    marginBottom: 8,
  },
  inlineMuted: {
    color: pdfTheme.colors.muted,
  },
  letterBody: {
    marginTop: 8,
  },
});
