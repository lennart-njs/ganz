import { portalLogin } from '@/config/portal.demo';
import { de } from '@/i18n/de';

import { Wordmark } from '../../components/Wordmark';
import { LoginForm } from './LoginForm';

export default function Anmelden() {
  // Demo: das Konto ist vorausgefüllt
  const email = portalLogin.email;
  return (
    <main className="login panel chambray" style={{ marginTop: 'var(--inset)' }}>
      <div className="card paper">
        <div className="wm" aria-label={de.portal.brand}>
          <Wordmark />
        </div>
        <h1 className="h2">{de.portal.title}</h1>
        <LoginForm email={email} />
      </div>
    </main>
  );
}
