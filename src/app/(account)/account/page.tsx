import { redirect } from 'next/navigation';

import { getSession } from '@/entities/user';
import { AccountView } from '@/views/account';

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <AccountView email={session.email} />;
}
