'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';

function safeDestination(value: FormDataEntryValue | null) {
  const destination = String(value ?? '/ho-so');
  return destination.startsWith('/') && !destination.startsWith('//') ? destination : '/ho-so';
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const destination = safeDestination(formData.get('next'));

  if (!email || !password) {
    redirect(`/?authError=missing&next=${encodeURIComponent(destination)}#dang-nhap`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    const message = error?.message.toLowerCase() ?? '';
    const code = message.includes('confirm')
      ? 'unconfirmed'
      : message.includes('rate') || message.includes('too many')
        ? 'limited'
        : 'invalid';

    redirect(`/?authError=${code}&next=${encodeURIComponent(destination)}#dang-nhap`);
  }

  redirect(destination);
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/?signedOut=1#dang-nhap');
}
