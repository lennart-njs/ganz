const G = () => window.GANZ;
function Scroll({ children, pad = '8px 20px 20px' }) { return <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: pad }}>{children}</div>; }
const H2 = ({ children }) => <h2 style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-app-h2)', lineHeight: 1.12, letterSpacing: '-0.02em', textWrap: 'balance' }}>{children}</h2>;
const Muted = ({ children, style }) => <div style={{ fontSize: 14, color: 'var(--text-muted)', ...style }}>{children}</div>;

function Welcome({ go }) {
  const { Wordmark, Button, BottomBar } = G();
  return <>
    <Scroll pad="12px 20px 0">
      <Wordmark size={26} />
      <div style={{ marginTop: 22, height: 300, borderRadius: 14, overflow: 'hidden' }}><img src="../../assets/app/welcome.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <h1 style={{ margin: '26px 0 0', fontWeight: 500, fontSize: 'var(--text-app-h1)', lineHeight: 1.08, letterSpacing: '-0.03em' }}>Reparatur, die mit einem Foto beginnt.</h1>
      <p style={{ margin: '14px 0 0', color: 'var(--text-body)', fontSize: 17, lineHeight: 1.45 }}>ganz erkennt, was deinem Haushaltsgerät fehlt, führt dich durch einfache Reparaturen und holt einen Fachbetrieb, wenn es nicht selbst geht.</p>
    </Scroll>
    <BottomBar style={{ borderTop: 0 }}><Button size="lg" fullWidth onClick={() => go('report')}>Los geht’s</Button><Muted style={{ textAlign: 'center' }}>Noch in der Testphase.</Muted></BottomBar>
  </>;
}
function Report({ go }) {
  const { AppHeader, TextField, Button, BottomBar } = G();
  const [t, setT] = React.useState('Spülmaschine pumpt nicht ab, unten steht Wasser.');
  return <>
    <AppHeader title="Problem melden" onBack={() => go('welcome')} />
    <Scroll>
      <H2>Was ist passiert?</H2>
      <p style={{ margin: '8px 0 16px', color: 'var(--text-body)' }}>Beschreib es so, wie du es jemandem am Telefon erzählen würdest.</p>
      <TextField multiline rows={3} value={t} onChange={e => setT(e.target.value)} />
      <Muted style={{ marginTop: 18 }}>Foto</Muted>
      <div style={{ marginTop: 6, height: 170, borderRadius: 14, overflow: 'hidden' }}><img src="../../assets/app/meldung-sieb.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <TextField label="Fehlercode im Display (falls angezeigt)" placeholder="z. B. E24" style={{ marginTop: 18 }} />
    </Scroll>
    <BottomBar><Button size="lg" fullWidth disabled={t.trim().length < 3} onClick={() => go('chat')}>Meldung senden</Button></BottomBar>
  </>;
}
function Chat({ go }) {
  const { AppHeader, ChatBubble, Button, BottomBar } = G();
  return <>
    <AppHeader title="Rückfragen" onBack={() => go('report')} />
    <Scroll pad="8px 16px 16px"><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ChatBubble from="user" note="Foto vom Sieb angehängt">Spülmaschine pumpt nicht ab, unten steht Wasser.</ChatBubble>
      <ChatBubble>Danke für die Meldung. Hörst du ein Brummen, wenn die Maschine abpumpen soll?</ChatBubble>
      <ChatBubble from="user">Ja, leise.</ChatBubble>
      <ChatBubble>Wann hast du das Sieb unten im Spülraum zuletzt gereinigt?</ChatBubble>
      <ChatBubble from="user">Noch nie.</ChatBubble>
      <ChatBubble>Danke, das reicht mir für eine Einschätzung.</ChatBubble>
    </div></Scroll>
    <BottomBar><Button size="lg" fullWidth onClick={() => go('diagnosis')}>Ergebnis ansehen</Button></BottomBar>
  </>;
}
function Diagnosis({ go }) {
  const { AppHeader, Card, FactList, NavRow, Button, BottomBar } = G();
  return <>
    <AppHeader title="Diagnose" onBack={() => go('chat')} />
    <Scroll>
      <Muted>Wahrscheinlich</Muted>
      <div style={{ marginTop: 4 }}><H2>Sieb und Pumpendeckel sind verstopft.</H2></div>
      <p style={{ margin: '12px 0 0', color: 'var(--text-body)', fontSize: 17 }}>Das kannst du ohne Werkzeug selbst reinigen. Stecker ziehen, dann zeigen wir dir, wo das Sieb sitzt.</p>
      <Card padding={16} style={{ marginTop: 20 }}><FactList dense items={[['Gerät','Spülmaschine'],['Fehlercode','keiner'],['Rückfragen','2 beantwortet']]} /></Card>
      <Muted style={{ marginTop: 26 }}>Andere Wege</Muted>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <NavRow title="Fachkraft per Video" sub="Jemand schaut per Kamera mit" onClick={() => go('status')} />
        <NavRow title="Fachbetrieb beauftragen" sub="Ein Betrieb kommt zu dir" onClick={() => go('status')} />
      </div>
    </Scroll>
    <BottomBar><Button size="lg" fullWidth onClick={() => go('guide')}>Anleitung starten</Button></BottomBar>
  </>;
}
function Guide({ go }) {
  const { AppHeader, StepProgress, Checkbox, Button, BottomBar, Toast } = G();
  const [ok, setOk] = React.useState(false);
  const [toast, setToast] = React.useState('');
  return <>
    <AppHeader title="Anleitung" onBack={() => go('diagnosis')} />
    <div style={{ padding: '0 20px' }}><StepProgress total={6} current={0} /></div>
    <Scroll pad="16px 20px 20px">
      <Muted>Schritt 1 von 6</Muted>
      <div style={{ marginTop: 4 }}><H2>Stecker ziehen</H2></div>
      <div style={{ marginTop: 16, height: 220, borderRadius: 14, overflow: 'hidden' }}><img src="../../assets/app/guide-1.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <p style={{ margin: '16px 0', fontSize: 17, color: 'var(--text-body)' }}>Zieh den Netzstecker der Spülmaschine. Kommst du nicht an die Steckdose, schalte die Sicherung ab.</p>
      <Checkbox checked={ok} onChange={setOk}>Der Stecker ist gezogen</Checkbox>
      <Button variant="link" style={{ marginTop: 10 }} onClick={() => go('status')}>Ich komme nicht weiter. Fachkraft per Video</Button>
    </Scroll>
    {toast && <Toast style={{ position: 'absolute', left: 16, right: 16, bottom: 112 }}>{toast}</Toast>}
    <BottomBar><Button size="lg" fullWidth disabled={!ok} onClick={() => { if (!ok) { setToast('Bitte zuerst den Stecker ziehen und bestätigen.'); setTimeout(() => setToast(''), 2600); } else go('status'); }}>Weiter</Button></BottomBar>
  </>;
}
function Status({ go }) {
  const { AppHeader, Card, Timeline, Button, BottomBar } = G();
  return <>
    <AppHeader title="Fallakte" onBack={() => go('diagnosis')} />
    <Scroll>
      <Muted>Fallakte · Spülmaschine</Muted>
      <div style={{ marginTop: 4 }}><H2>Termin Do, 16.10. 10–12 Uhr</H2></div>
      <p style={{ margin: '8px 0 0', color: 'var(--text-body)' }}>Das Teil ist bestellt. Der Betrieb bringt es zum Termin mit.</p>
      <Card padding={16} style={{ marginTop: 20 }}><Timeline items={[
        { when: 'Mo, 13.10. · 19:42', what: 'Meldung: Spülmaschine pumpt nicht ab' },
        { when: 'Mo, 13.10. · 19:45', what: 'Diagnose: Sieb und Pumpendeckel verstopft' },
        { when: 'Mo, 13.10. · 20:12', what: 'Videoberatung: Laugenpumpe defekt' },
        { when: 'Mo, 13.10. · 20:15', what: 'Kostenvoranschlag [PREIS] zugestimmt' },
        { when: 'Do, 16.10. 10–12 Uhr', what: 'Fachbetrieb [BETRIEB] kommt vorbei', pending: true },
      ]} /></Card>
    </Scroll>
    <BottomBar><Button variant="secondary" size="lg" fullWidth onClick={() => go('welcome')}>Test neu starten</Button></BottomBar>
  </>;
}
Object.assign(window, { Welcome, Report, Chat, Diagnosis, Guide, Status });
