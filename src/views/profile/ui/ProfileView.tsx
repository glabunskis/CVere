import type { ProfileChildren } from '@/entities/cv';
import type { CvRow } from '@/entities/cv';
import { FactEditor } from '@/features/profile-editor';
import type { CvDateFormat } from '@/shared/lib/format-date';

type ContactProfile = Pick<
  CvRow,
  'full_name' | 'location' | 'phone' | 'contact_email' | 'linkedin_url' | 'github_url' | 'website_url'
>;

type ProfileViewProps = {
  profileTitle: string;
  summary: string | null;
  contact: ContactProfile;
  fallbackEmail: string | null;
  fallbackFullName: string | null;
  sections: ProfileChildren;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
};

export function ProfileView({
  profileTitle,
  summary,
  contact,
  fallbackEmail,
  fallbackFullName,
  sections,
  educationDateFormat,
  certificationDateFormat,
}: ProfileViewProps) {
  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>CV editor</h1>
        <p className='text-sm text-muted-foreground'>Editing: {profileTitle}</p>
      </header>
      <FactEditor
        summary={summary}
        contact={contact}
        fallbackEmail={fallbackEmail}
        fallbackFullName={fallbackFullName}
        sections={sections}
        educationDateFormat={educationDateFormat}
        certificationDateFormat={certificationDateFormat}
      />
    </section>
  );
}
