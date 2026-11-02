import React from 'react';

export function Timeline({ items = [], style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', ...style }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const open = it.pending;
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, background: open ? 'var(--white)' : 'var(--ink-900)', border: '2px solid var(--ink-900)', boxSizing: 'border-box' }} />
              {!last && <span style={{ flex: 1, width: 2, background: 'var(--border-subtle)', minHeight: 14 }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : 14 }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{it.when}</div>
              <div style={{ fontSize: 'var(--text-md)', color: 'var(--text-strong)' }}>{it.what}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
