'use client';

import { useState, useTransition } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfileRow } from '@/features/profile/controllers/get-profile';

import { updateProfileSection } from '../actions/update-profile-section';

import { SectionShell } from './section-shell';

type ContactDraft = {
  fullName: string;
  location: string;
  phone: string;
  contactEmail: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
};

type Props = {
  profile: Pick<
    ProfileRow,
    'full_name' | 'location' | 'phone' | 'contact_email' | 'linkedin_url' | 'github_url' | 'website_url'
  >;
  fallbackEmail?: string | null;
  fallbackFullName?: string | null;
  readOnly?: boolean;
};

function toDraft(profile: Props['profile']): ContactDraft {
  return {
    fullName: profile.full_name ?? '',
    location: profile.location ?? '',
    phone: profile.phone ?? '',
    contactEmail: profile.contact_email ?? '',
    linkedinUrl: profile.linkedin_url ?? '',
    githubUrl: profile.github_url ?? '',
    websiteUrl: profile.website_url ?? '',
  };
}

export function ContactEditor({
  profile,
  fallbackEmail,
  fallbackFullName,
  readOnly = false,
}: Props) {
  const [draft, setDraft] = useState<ContactDraft>(() => toDraft(profile));
  const [, startTransition] = useTransition();

  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => toast.success('Contact saved'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save contact'),
  });

  if (readOnly) {
    return (
      <SectionShell title='Contact' description='Header contact line.'>
        <ContactReadOnly
          draft={draft}
          fallbackEmail={fallbackEmail}
          fallbackFullName={fallbackFullName}
        />
      </SectionShell>
    );
  }

  return (
    <SectionShell
      title='Contact'
      description='Shown in the CV header. Name and email default to your account values if left blank.'
    >
      <form
        className='grid gap-3 sm:grid-cols-2'
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            execute({
              section: 'contact',
              payload: {
                fullName: draft.fullName || null,
                location: draft.location || null,
                phone: draft.phone || null,
                contactEmail: draft.contactEmail || null,
                linkedinUrl: draft.linkedinUrl || null,
                githubUrl: draft.githubUrl || null,
                websiteUrl: draft.websiteUrl || null,
              },
            });
          });
        }}
      >
        <Field
          label='Full name'
          htmlFor='contact-full-name'
          className='sm:col-span-2'
          hint={fallbackFullName ? `Defaults to ${fallbackFullName}` : undefined}
        >
          <Input
            id='contact-full-name'
            value={draft.fullName}
            placeholder={fallbackFullName ?? 'Your name'}
            autoComplete='name'
            onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
          />
        </Field>
        <Field label='Location' htmlFor='contact-location'>
          <Input
            id='contact-location'
            value={draft.location}
            placeholder='City, Country'
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
          />
        </Field>
        <Field label='Phone' htmlFor='contact-phone'>
          <Input
            id='contact-phone'
            value={draft.phone}
            placeholder='+371 12345678'
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </Field>
        <Field
          label='Public email'
          htmlFor='contact-email'
          hint={fallbackEmail ? `Defaults to ${fallbackEmail}` : undefined}
        >
          <Input
            id='contact-email'
            type='email'
            value={draft.contactEmail}
            placeholder={fallbackEmail ?? 'you@example.com'}
            onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
          />
        </Field>
        <Field label='LinkedIn URL' htmlFor='contact-linkedin'>
          <Input
            id='contact-linkedin'
            type='url'
            value={draft.linkedinUrl}
            placeholder='https://www.linkedin.com/in/handle'
            onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })}
          />
        </Field>
        <Field label='GitHub URL' htmlFor='contact-github'>
          <Input
            id='contact-github'
            type='url'
            value={draft.githubUrl}
            placeholder='https://github.com/handle'
            onChange={(event) => setDraft({ ...draft, githubUrl: event.target.value })}
          />
        </Field>
        <Field label='Website / portfolio' htmlFor='contact-website'>
          <Input
            id='contact-website'
            type='url'
            value={draft.websiteUrl}
            placeholder='https://your.site'
            onChange={(event) => setDraft({ ...draft, websiteUrl: event.target.value })}
          />
        </Field>
        <div className='flex justify-end sm:col-span-2'>
          <Button type='submit' size='sm' disabled={isExecuting}>
            {isExecuting ? 'Saving...' : 'Save contact'}
          </Button>
        </div>
      </form>
    </SectionShell>
  );
}

function ContactReadOnly({
  draft,
  fallbackEmail,
  fallbackFullName,
}: {
  draft: ContactDraft;
  fallbackEmail?: string | null;
  fallbackFullName?: string | null;
}) {
  const items: Array<[string, string]> = [
    ['Full name', draft.fullName || fallbackFullName || ''],
    ['Location', draft.location],
    ['Phone', draft.phone],
    ['Email', draft.contactEmail || fallbackEmail || ''],
    ['LinkedIn', draft.linkedinUrl],
    ['GitHub', draft.githubUrl],
    ['Website', draft.websiteUrl],
  ];

  return (
    <dl className='grid gap-2 text-sm sm:grid-cols-2'>
      {items.map(([label, value]) => (
        <div key={label} className='flex flex-col gap-0.5'>
          <dt className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</dt>
          <dd className='break-all'>{value || <span className='text-muted-foreground'>[MISSING]</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ''}`}>
      <Label htmlFor={htmlFor} className='text-xs'>
        {label}
      </Label>
      {children}
      {hint ? <p className='text-[11px] text-muted-foreground'>{hint}</p> : null}
    </div>
  );
}
