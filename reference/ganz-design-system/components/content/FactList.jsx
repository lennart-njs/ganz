import React from 'react';

export function FactList({ items = [], labelWidth = 96, dense = false, ruled = false, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: labelWidth + 'px minmax(0,1fr)', columnGap: 12, rowGap: ruled ? 0 : 8, fontFamily: 'var(--font-sans)', fontSize: dense ? 'var(--text-md)' : 'var(--text-base)', lineHeight: 1.4, ...style }}>
      {items.map(([k, v], i) => {
        const cell = ruled ? { borderTop: '1px solid var(--border-subtle)', padding: '10px 0', borderBottom: i === items.length - 1 ? '1px solid var(--border-subtle)' : undefined } : {};
        return (
          <React.Fragment key={i}>
            <span style={{ color: 'var(--text-muted)', ...cell }}>{k}</span>
            <span style={{ color: 'var(--text-strong)', ...cell }}>{v}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
