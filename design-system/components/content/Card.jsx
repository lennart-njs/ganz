import React from 'react';

export function Card({ tone = 'white', padding = 24, media, mediaRatio = '16/10', float = false, children, style }) {
  const tones = {
    white: { background: 'var(--surface-card)', color: 'var(--text-strong)' },
    sunken: { background: 'var(--surface-sunken)', color: 'var(--text-strong)' },
    inverse: { background: 'var(--surface-inverse)', color: 'var(--text-inverse)' },
  };
  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: float ? 'var(--shadow-float)' : 'none', fontFamily: 'var(--font-sans)', ...tones[tone], ...style }}>
      {media && <div style={{ aspectRatio: mediaRatio, overflow: 'hidden' }}>{typeof media === 'string' ? <img src={media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : media}</div>}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}

export function CardTitle({ children, size = 20 }) {
  return <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: size, lineHeight: 1.3 }}>{children}</div>;
}

export function CardText({ children }) {
  return <p style={{ margin: '8px 0 0', fontSize: 'var(--text-base)', lineHeight: 'var(--leading-body)', color: 'inherit', opacity: 1 }}>{children}</p>;
}
