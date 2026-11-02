'use server';

import { redirect } from 'next/navigation';

import { login } from '../../lib/api';
import { setSession } from '../../lib/session';

export async function signIn(_prev: string | undefined, form: FormData) {
  const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
  if (result === 'falsch' || result === 'offline') return result;
  await setSession(result.token);
  redirect('/');
}
