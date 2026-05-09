import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

import tailwindConfig from './tailwind.config';

const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export function WelcomeEmail() {
  return (
    <Html>
      <Head />
      <Preview>Welcome!</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className='mx-auto my-auto bg-slate-100 px-2 py-10 font-sans'>
          <Container className='mx-auto mt-[40px] w-[464px] overflow-hidden rounded-md bg-white'>
            <Section className='p-8'>
              <Heading as='h1' className='m-0 text-[28px] font-bold'>
                Welcome!
              </Heading>
              <Text className='my-6 text-[16px]'>Thanks for signing up. Go to your dashboard to get started.</Text>
              <Button href={baseUrl + '/account'} className='rounded-md bg-black px-4 py-2 font-medium text-white'>
                Go to Dashboard
              </Button>
            </Section>
          </Container>
          <Container className='mx-auto mt-4'>
            <Section className='text-center'>
              <Text className='m-0 text-xs text-slate-500'>Not interested in receiving this email?</Text>
              <Link className='text-center text-xs text-slate-500 underline' href={baseUrl + '/account'}>
                Manage your notification settings.
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default WelcomeEmail;
