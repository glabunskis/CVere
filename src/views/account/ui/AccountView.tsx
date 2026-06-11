type AccountViewProps = {
  email: string | undefined;
};

export function AccountView({ email }: AccountViewProps) {
  return (
    <section className='py-16'>
      <h1 className='mb-8 text-center text-3xl font-bold'>Account</h1>

      <div className='m-auto flex max-w-2xl flex-col gap-6'>
        <div className='rounded-lg border p-6'>
          <h2 className='mb-1 text-lg font-semibold'>Profile</h2>
          <p className='text-sm text-muted-foreground'>{email}</p>
        </div>
      </div>
    </section>
  );
}
