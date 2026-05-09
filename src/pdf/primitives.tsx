import { Text, View } from '@react-pdf/renderer';

import { styles } from './theme';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'\u2022'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Header({ name, contact }: { name: string; contact?: string }) {
  return (
    <View>
      <Text style={styles.title}>{name}</Text>
      {contact ? <Text style={styles.subtitle}>{contact}</Text> : null}
    </View>
  );
}
