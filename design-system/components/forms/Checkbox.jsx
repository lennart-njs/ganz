import React from 'react';

export function Checkbox({ checked = false, onChange, children, style }) {
  return (
    <button type="button" aria-pressed={checked} onClick={() => onChange && onChange(!checked)}
      style={{ width: '100%', minHeight: 'var(--control-h-lg)', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-strong)', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box', ...style }}>
      <span style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: 'var(--radius-check)', border: '2px solid var(--ink-900)', background: checked ? 'var(--ink-900)' : 'var(--surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#F5F4F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span style={{ lineHeight: 1.4 }}>{children}</span>
    </button>
  );
}
