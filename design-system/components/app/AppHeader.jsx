import React from 'react';

export function AppHeader({ title, onBack, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 44px', alignItems: 'center', padding: '4px 10px', fontFamily: 'var(--font-sans)', ...style }}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Zurück" style={{ width: 44, height: 44, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M9 2L2 9l7 7" stroke="#16181A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : <span />}
      <div style={{ textAlign: 'center', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-strong)' }}>{title}</div>
      <span />
    </div>
  );
}

export function BottomBar({ children, style }) {
  return <div style={{ padding: '12px 20px 42px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-page)', ...style }}>{children}</div>;
}
