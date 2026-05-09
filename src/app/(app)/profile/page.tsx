import { FactEditor } from '@/features/profile/components/fact-editor';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();
  if (!profile) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        Sign in to manage your profile.
      </section>
    );
  }

  const sections = await getProfileChildren(profile.id);

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Profile</h1>
        <p className='text-sm text-muted-foreground'>
          Canonical fact base. The only place facts are written. Tailored variants never overwrite this.
        </p>
      </header>
      <FactEditor summary={profile.summary} sections={sections} />
    </section>
  );
}
