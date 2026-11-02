'use client';

import { useActionState } from 'react';

import { de } from '@/i18n/de';

import { signIn } from './actions';

const t = de.portal.login;

export function LoginForm({ email }: { email?: string }) {
  const [error, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="email">{t.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          defaultValue={email}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p className="flash bad" role="alert">
          <span className="dot" aria-hidden />
          {error === 'offline' ? t.offline : t.failed}
        </p>
      ) : null}
      <button className="btn btn-block" type="submit" disabled={pending}>
        {t.submit}
      </button>
    </form>
  );
}
