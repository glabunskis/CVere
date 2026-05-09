import { Document, Page, Text, View } from '@react-pdf/renderer';

import { Header } from './primitives';
import { pdfTheme, styles } from './theme';

export function CoverLetter({
  body,
  identityName,
  contactLine,
}: {
  body: string;
  identityName: string;
  contactLine?: string;
}) {
  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contactLine} />
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
