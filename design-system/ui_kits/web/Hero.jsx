function Hero({ img, title, lead, primary, secondary, panel }) {
  const { Button } = window.GANZ;
  return (
    <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '16px var(--page-gutter) 0' }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: 680, display: 'flex' }}>
        <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-bottom)' }} />
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexWrap: 'wrap', gap: '40px 56px', alignItems: 'flex-end', justifyContent: 'space-between', padding: 'clamp(28px,4.5vw,64px)' }}>
          <div style={{ flex: '1 1 480px', minWidth: 0, color: '#FFFFFF' }}>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: 'var(--text-h1)', lineHeight: 1.04, letterSpacing: '-0.035em', maxWidth: '13ch', textWrap: 'balance' }}>{title}</h1>
            <p style={{ margin: '22px 0 0', fontSize: 19, lineHeight: 1.5, color: 'var(--fog-200)', maxWidth: '44ch' }}>{lead}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
              <Button variant="inverse">{primary}</Button>
              <Button variant="outlineOnPhoto">{secondary}</Button>
            </div>
          </div>
          {panel}
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
