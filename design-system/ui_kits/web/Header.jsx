function Header({ audience, setAudience, links, cta }) {
  const { Wordmark, SegmentedControl, Button } = window.GANZ;
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '14px var(--page-gutter)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <Wordmark size={24} />
        <SegmentedControl ariaLabel="Zielgruppe wählen" options={['Zu Hause', 'Hersteller & Handel', 'Fachbetriebe']} value={audience} onChange={setAudience} />
        <nav style={{ display: 'flex', gap: 24, flex: 1, justifyContent: 'flex-end', fontSize: 15 }}>
          {links.map(l => <a key={l} href={'#' + l} style={{ color: 'var(--text-body)', textDecoration: 'none' }}>{l}</a>)}
        </nav>
        <Button size="sm">{cta}</Button>
      </div>
    </header>
  );
}
window.Header = Header;
