import React from 'react';

export function TextField({ label, hint, multiline = false, rows = 4, pill = false, style, inputStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const base = {
    width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', lineHeight: 1.4,
    color: 'var(--text-strong)', background: 'var(--surface-card)', border: '1px solid ' + (focus ? 'var(--ink-900)' : 'var(--border-input)'),
    borderRadius: pill ? 24 : 'var(--radius-sm)', outline: 'none',
    padding: multiline ? '12px 14px' : '0 14px', minHeight: multiline ? undefined : 'var(--control-h)', resize: 'none', ...inputStyle,
  };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...style }}>
      {label && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>}
      <Tag rows={multiline ? rows : undefined} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={base} {...rest} />
      {hint && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );
}
