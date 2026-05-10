import { Text, View } from '@react-pdf/renderer';

import { type PdfStyles, styles as defaultStyles } from './theme';

type WithStyles = { styles?: PdfStyles };

export function Section({
  title,
  children,
  styles = defaultStyles,
}: { title: string; children: React.ReactNode } & WithStyles) {
  return (
    <View style={styles.group} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Bullet({
  children,
  styles = defaultStyles,
}: { children: React.ReactNode } & WithStyles) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'\u2022'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Header({
  name,
  contact,
  styles = defaultStyles,
}: { name: string; contact?: string } & WithStyles) {
  return (
    <View>
      <Text style={styles.title}>{name}</Text>
      {contact ? <Text style={styles.subtitle}>{contact}</Text> : null}
    </View>
  );
}
