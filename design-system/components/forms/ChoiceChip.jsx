import React from 'react';

export function ChoiceChip({ selected = false, onClick, children, sub, style }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      style={{ minHeight: sub ? 56 : 'var(--hit-min)', padding: sub ? '6px 10px' : '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + (selected ? 'var(--ink-900)' : 'var(--border-default)'), background: selected ? 'var(--ink-900)' : 'var(--surface-card)', color: selected ? 'var(--fog-100)' : 'var(--text-strong)', fontFamily: 'var(--font-sans)', fontSize: sub ? 'var(--text-sm)' : 'var(--text-base)', lineHeight: 1.25, fontWeight: 'var(--weight-medium)', cursor: 'pointer', ...style }}>
      {children}{sub && <span style={{ display: 'block', fontWeight: 'var(--weight-regular)' }}>{sub}</span>}
    </button>
  );
}
