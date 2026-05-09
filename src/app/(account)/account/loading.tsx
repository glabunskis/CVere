export default function AccountLoading() {
  return (
    <section className='py-16'>
      <div className='mb-8 flex justify-center'>
        <div className='h-8 w-48 animate-pulse rounded bg-muted' />
      </div>
      <div className='m-auto flex max-w-2xl flex-col gap-6'>
        <div className='rounded-lg border p-6'>
          <div className='mb-2 h-5 w-24 animate-pulse rounded bg-muted' />
          <div className='h-4 w-48 animate-pulse rounded bg-muted' />
        </div>
        <div className='rounded-lg border p-6'>
          <div className='mb-4 h-5 w-32 animate-pulse rounded bg-muted' />
          <div className='h-4 w-40 animate-pulse rounded bg-muted' />
        </div>
      </div>
    </section>
  );
}
