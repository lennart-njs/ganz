import React from 'react';

export function NavRow({ title, sub, onClick, tone = 'white', style }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: '100%', minHeight: 'var(--control-h-lg)', textAlign: 'left', padding: '10px 14px', border: tone === 'white' ? '1px solid var(--border-default)' : 0, borderRadius: 'var(--radius-sm)', background: tone === 'white' ? 'var(--surface-card)' : 'var(--surface-sunken)', fontFamily: 'var(--font-sans)', color: 'var(--text-strong)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, boxSizing: 'border-box', ...style }}>
      <span>
        <span style={{ display: 'block', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)' }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{sub}</span>}
      </span>
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flex: '0 0 auto' }}><path d="M1 1l6 6-6 6" stroke="#5C5F63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
