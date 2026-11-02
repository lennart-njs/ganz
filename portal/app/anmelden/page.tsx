import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';

import { Wordmark } from '../../components/Wordmark';
import { LoginForm } from './LoginForm';

export default function Anmelden() {
  // Demo: das Konto des ersten Händlers mit Portal-Zugang ist vorausgefüllt
  const demo = demoConfig.dealers.find((d) => 'portalUser' in d && d.portalUser);
  const email = demo && 'portalUser' in demo ? demo.portalUser : undefined;
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
