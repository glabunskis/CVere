import { Fragment } from 'react';

import { Link, Text, View } from '@react-pdf/renderer';

import { GithubIcon, GlobeIcon, LinkedInIcon, MailIcon, MapPinIcon, PhoneIcon } from './icons';
import { type PdfStyles, styles as defaultStyles } from './theme';

type WithStyles = { styles?: PdfStyles };

export type ProfileContact = {
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
};

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

type IconKind = 'map' | 'mail' | 'phone' | 'linkedin' | 'github' | 'globe';

type HeaderItem = {
  icon: IconKind;
  label: string;
  href?: string;
};

const ICON_BY_KIND = {
  map: MapPinIcon,
  mail: MailIcon,
  phone: PhoneIcon,
  linkedin: LinkedInIcon,
  github: GithubIcon,
  globe: GlobeIcon,
} as const;

function buildHeaderItems(contact: ProfileContact | undefined): HeaderItem[] {
  if (!contact) return [];
  const items: HeaderItem[] = [];

  if (contact.location) items.push({ icon: 'map', label: contact.location });
  if (contact.email) {
    items.push({ icon: 'mail', label: contact.email, href: `mailto:${contact.email}` });
  }
  if (contact.phone) items.push({ icon: 'phone', label: contact.phone });
  if (contact.linkedinUrl) {
    items.push({
      icon: 'linkedin',
      label: humanizeLinkedIn(contact.linkedinUrl),
      href: contact.linkedinUrl,
    });
  }
  if (contact.githubUrl) {
    items.push({
      icon: 'github',
      label: humanizeGithub(contact.githubUrl),
      href: contact.githubUrl,
    });
  }
  if (contact.websiteUrl) {
    items.push({ icon: 'globe', label: humanizeUrl(contact.websiteUrl), href: contact.websiteUrl });
  }
  return items;
}

function humanizeLinkedIn(url: string): string {
  const m = url.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/i);
  return m ? m[1] : humanizeUrl(url);
}

function humanizeGithub(url: string): string {
  const m = url.match(/github\.com\/([^/?#]+)/i);
  return m ? m[1] : humanizeUrl(url);
}

function humanizeUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function Header({
  name,
  contact,
  contactLine,
  accent,
  styles = defaultStyles,
}: {
  name: string;
  contact?: ProfileContact;
  contactLine?: string;
  accent?: string;
} & WithStyles) {
  const items = buildHeaderItems(contact);
  const iconColor = styles.headerContactText.color ?? '#1a1a1a';
  const linkColor = (styles.headerContactLink.color ?? accent ?? '#0066CC') as string;

  return (
    <View>
      <Text style={styles.title}>{name}</Text>
      {items.length > 0 ? (
        <View style={styles.headerContactRow}>
          {items.map((item, idx) => {
            const Icon = ICON_BY_KIND[item.icon];
            const isLink = Boolean(item.href);
            return (
              <Fragment key={`${item.icon}-${idx}`}>
                {idx > 0 ? <Text style={styles.headerContactSeparator}>{'\u00B7'}</Text> : null}
                <View style={styles.headerContactItem}>
                  <View style={styles.headerContactIcon}>
                    <Icon color={isLink ? linkColor : (iconColor as string)} />
                  </View>
                  {isLink ? (
                    <Link src={item.href!} style={styles.headerContactLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <Text style={styles.headerContactText}>{item.label}</Text>
                  )}
                </View>
              </Fragment>
            );
          })}
        </View>
      ) : contactLine ? (
        <Text style={styles.subtitle}>{contactLine}</Text>
      ) : null}
    </View>
  );
}
