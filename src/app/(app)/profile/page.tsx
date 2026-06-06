import { getCvChildren } from '@/features/cv/controllers/get-cv-children';
import { getSelectedCv } from '@/features/cv/services/cv-service';
import { FactEditor } from '@/features/profile/components/fact-editor';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { DEFAULT_CV_DATE_FORMAT } from '@/utils/format-date';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        Sign in to edit your CV.
      </section>
    );
  }

  const profile = await getSelectedCv(user.id);

  const sections = await getCvChildren(profile.id);

  const userMetadata = (user?.user_metadata ?? {}) as { full_name?: string };

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>CV editor</h1>
        <p className='text-sm text-muted-foreground'>Editing: {profile.title}</p>
      </header>
      <FactEditor
        summary={profile.summary}
        contact={profile}
        fallbackEmail={user?.email ?? null}
        fallbackFullName={userMetadata.full_name ?? null}
        sections={sections}
        educationDateFormat={profile.education_date_format ?? DEFAULT_CV_DATE_FORMAT}
        certificationDateFormat={profile.certification_date_format ?? DEFAULT_CV_DATE_FORMAT}
      />
    </section>
  );
}
