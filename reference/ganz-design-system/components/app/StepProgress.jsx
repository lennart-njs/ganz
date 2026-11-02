import React from 'react';

export function StepProgress({ total = 6, current = 0, style }) {
  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= current ? 'var(--ink-900)' : 'var(--border-default)' }} />
      ))}
    </div>
  );
}
