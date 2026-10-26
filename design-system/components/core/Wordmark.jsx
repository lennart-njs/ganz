import React from 'react';

export function Wordmark({ size = 24, inverse = false, style }) {
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--type-wordmark-weight)', fontSize: size, letterSpacing: 'var(--type-wordmark-tracking)', lineHeight: 1, color: inverse ? 'var(--text-inverse)' : 'var(--text-strong)', ...style }}>ganz</span>
  );
}
