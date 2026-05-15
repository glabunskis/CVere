import { Document, Page, Text, View } from '@react-pdf/renderer';

import { Header, type ProfileContact } from './primitives';
import { createStyles, DEFAULT_ACCENT, pdfTheme } from './theme';

export function CoverLetter({
  body,
  identityName,
  contact,
  contactLine,
  accent = DEFAULT_ACCENT,
}: {
  body: string;
  identityName: string;
  contact?: ProfileContact;
  contactLine?: string;
  accent?: string;
}) {
  const styles = createStyles(accent);
  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header
          name={identityName}
          contact={contact}
          contactLine={contactLine}
          accent={accent}
          styles={styles}
        />
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
