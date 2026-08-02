'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';

const siteUrl = 'https://htl-ho-so-chuan.vercel.app';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) redirect('/?authError=missing#dang-nhap');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = error.message.toLowerCase().includes('confirm') ? 'unconfirmed' : 'invalid';
    redirect(`/?authError=${code}#dang-nhap`);
  }

  redirect('/ho-so');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!email || !password || !confirmPassword) redirect('/dang-ky?error=missing');
  if (password.length < 8) redirect('/dang-ky?error=weak');
  if (password !== confirmPassword) redirect('/dang-ky?error=mismatch');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) redirect('/dang-ky?error=failed');
  if (data.session) redirect('/ho-so');
  redirect('/dang-ky?success=check-email');
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect('/quen-mat-khau?error=missing');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/dat-lai-mat-khau`,
  });

  if (error) redirect('/quen-mat-khau?error=failed');
  redirect('/quen-mat-khau?success=check-email');
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!password || !confirmPassword) redirect('/dat-lai-mat-khau?error=missing');
  if (password.length < 8) redirect('/dat-lai-mat-khau?error=weak');
  if (password !== confirmPassword) redirect('/dat-lai-mat-khau?error=mismatch');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) redirect('/dat-lai-mat-khau?error=failed');
  redirect('/?passwordReset=success#dang-nhap');
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
