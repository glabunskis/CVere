import { redirect } from 'next/navigation';

import { getSession } from '@/entities/user';
import { HomeView } from '@/views/home';

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <HomeView />
    </div>
  );
}
