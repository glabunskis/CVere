import { Document, Page, Text, View } from '@react-pdf/renderer';

import { Header } from './primitives';
import { createStyles, DEFAULT_ACCENT, pdfTheme } from './theme';

export function CoverLetter({
  body,
  identityName,
  contactLine,
  accent = DEFAULT_ACCENT,
}: {
  body: string;
  identityName: string;
  contactLine?: string;
  accent?: string;
}) {
  const styles = createStyles(accent);
  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contactLine} styles={styles} />
        <View style={styles.letterBody}>
          {body.split(/\n\s*\n/).map((paragraph, idx) => (
            <Text key={idx} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
