import React from 'react';

export function StarRating({ value = 0, onChange, style }) {
  return (
    <div role="group" aria-label="Bewertung" style={{ display: 'flex', gap: 6, ...style }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" aria-label={n + ' von 5'} onClick={() => onChange && onChange(n)}
          style={{ width: 48, height: 48, border: 0, background: 'transparent', fontSize: 32, lineHeight: 1, color: n <= value ? 'var(--ink-900)' : 'var(--border-default)', cursor: 'pointer', padding: 0 }}>★</button>
      ))}
    </div>
  );
}
