function Ways() {
  const { Card, CardTitle, CardText } = window.GANZ;
  const ways = [
    ['../../assets/web/b-flusensieb.jpg', 'Diagnose', 'Beschreib das Problem, nenn den Fehlercode, mach ein Foto. ganz findet die wahrscheinliche Ursache.'],
    ['../../assets/web/b-videocall.jpg', 'Anleitung oder Fachkraft per Video', 'Schritt für Schritt für dein Modell. Kommst du nicht weiter, schaut eine Fachkraft per Video mit.'],
    ['../../assets/web/b-monteurin.jpg', 'Fachbetrieb vor Ort', 'Ein geprüfter Betrieb kommt mit Diagnose und passendem Teil.'],
  ];
  return (
    <section id="So funktioniert’s" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '104px var(--page-gutter) 0' }}>
      <h2 style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: '18ch' }}>Drei Wege, je nachdem, was kaputt ist.</h2>
      <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 20 }}>
        {ways.map(([img, t, d]) => <Card key={t} media={img} padding="22px 24px 26px"><CardTitle>{t}</CardTitle><CardText>{d}</CardText></Card>)}
      </div>
    </section>
  );
}
function Safety() {
  return (
    <section id="Sicherheit" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '104px var(--page-gutter) 0' }}>
      <div style={{ background: 'var(--surface-inverse)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-lg)', padding: 'clamp(32px,5vw,72px)', display: 'flex', flexWrap: 'wrap', gap: '36px 72px' }}>
        <h2 style={{ flex: '1 1 420px', margin: 0, fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: '16ch' }}>Wann wir dir keine Anleitung geben.</h2>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column' }}>
          {['Gas', 'Netzspannung bei geöffnetem Gerät', 'Kältemittelkreislauf', 'Wenn du dir unsicher bist'].map((x, i, a) => (
            <div key={x} style={{ padding: '18px 0', borderTop: '1px solid var(--border-inverse)', borderBottom: i === a.length - 1 ? '1px solid var(--border-inverse)' : 0, fontSize: 20, fontWeight: 500 }}>{x}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Signup({ title, placeholder, cta }) {
  const { TextField, Button } = window.GANZ;
  const [sent, setSent] = React.useState(false);
  return (
    <section id="Testphase" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '104px var(--page-gutter) 0' }}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 'clamp(28px,4vw,56px)', display: 'flex', flexWrap: 'wrap', gap: '24px 56px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 360px' }}>
          <h2 style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>{title}</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--text-body)' }}>Wir melden uns, sobald dein Gerät dabei ist.</p>
        </div>
        {sent ? <div style={{ flex: '1 1 420px', fontWeight: 500 }}>Danke. Wir melden uns.</div> : (
          <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ flex: '1 1 420px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField type="email" required placeholder={placeholder} aria-label="E-Mail" style={{ flex: '1 1 240px' }} />
            <Button type="submit" size="lg">{cta}</Button>
          </form>
        )}
      </div>
    </section>
  );
}
function Footer() {
  const { Wordmark } = window.GANZ;
  return (
    <footer style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '104px var(--page-gutter) 40px' }}>
      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: '16px 32px', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 14, color: 'var(--text-muted)' }}>
        <Wordmark size={20} /><span>[FIRMA GMBH] · [ADRESSE]</span><span style={{ display: 'flex', gap: 24 }}><a href="#">Impressum</a><a href="#">Datenschutz</a></span>
      </div>
    </footer>
  );
}
Object.assign(window, { Ways, Safety, Signup, Footer });
