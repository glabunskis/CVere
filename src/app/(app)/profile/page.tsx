import { getCvChildren, getSelectedCv } from '@/entities/cv';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { DEFAULT_CV_DATE_FORMAT } from '@/shared/lib/format-date';
import { ProfileView } from '@/views/profile';

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
    <ProfileView
      profileTitle={profile.title}
      summary={profile.summary}
      contact={profile}
      fallbackEmail={user.email ?? null}
      fallbackFullName={userMetadata.full_name ?? null}
      sections={sections}
      educationDateFormat={profile.education_date_format ?? DEFAULT_CV_DATE_FORMAT}
      certificationDateFormat={profile.certification_date_format ?? DEFAULT_CV_DATE_FORMAT}
    />
  );
}
