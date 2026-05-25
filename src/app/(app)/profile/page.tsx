import { FactEditor } from '@/features/profile/components/fact-editor';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { DEFAULT_CV_DATE_FORMAT } from '@/utils/format-date';

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();
  if (!profile) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        Sign in to manage your profile.
      </section>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sections = await getProfileChildren(profile.id);

  const userMetadata = (user?.user_metadata ?? {}) as { full_name?: string };

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Profile</h1>
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
