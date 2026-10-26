import React from 'react';

export function SegmentedControl({ options = [], value, onChange, ariaLabel, style }) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--surface-muted)', borderRadius: 'var(--radius-segment)', ...style }}>
      {options.map(o => {
        const on = o === value;
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onChange && onChange(o)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-medium)', padding: '7px 14px', border: 0, borderRadius: 7, whiteSpace: 'nowrap', cursor: 'pointer', background: on ? 'var(--surface-card)' : 'transparent', color: on ? 'var(--text-strong)' : 'var(--text-body)', transition: 'background var(--duration-fade) var(--ease-standard)' }}>{o}</button>
        );
      })}
    </div>
  );
}
