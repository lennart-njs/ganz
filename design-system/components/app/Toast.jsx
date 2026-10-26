import React from 'react';

export function Toast({ children, style }) {
  return <div role="status" style={{ background: 'var(--ink-900)', color: 'var(--fog-100)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', textAlign: 'center', ...style }}>{children}</div>;
}
