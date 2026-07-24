'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!email || !password || !confirmPassword) {
    redirect('/?signUpError=missing#dang-ky');
  }

  if (password.length < 8) {
    redirect('/?signUpError=weak#dang-ky');
  }

  if (password !== confirmPassword) {
    redirect('/?signUpError=mismatch#dang-ky');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const message = error.message.toLowerCase();
    const code = message.includes('registered') || message.includes('exists') ? 'exists' : 'failed';
    redirect(`/?signUpError=${code}#dang-ky`);
  }

  if (data.session) {
    redirect('/ho-so');
  }

  redirect('/?signUpSuccess=confirm#dang-ky');
}
