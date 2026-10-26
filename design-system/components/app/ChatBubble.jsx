import React from 'react';

export function ChatBubble({ from = 'ganz', children, note, style }) {
  const user = from === 'user';
  return (
    <div style={{ alignSelf: user ? 'flex-end' : 'flex-start', maxWidth: user ? '80%' : '84%', background: user ? 'var(--ink-900)' : 'var(--surface-card)', color: user ? 'var(--fog-100)' : 'var(--text-strong)', borderRadius: user ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 1.45, ...style }}>
      {!user && <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', marginBottom: 2 }}>ganz</span>}
      {children}
      {note && <span style={{ display: 'block', marginTop: 4, fontSize: 'var(--text-xs)', color: user ? 'var(--stone-400)' : 'var(--text-muted)' }}>{note}</span>}
    </div>
  );
}
