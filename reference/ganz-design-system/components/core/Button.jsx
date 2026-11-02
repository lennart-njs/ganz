import React from 'react';

const SIZES = {
  md: { minHeight: 'var(--control-h)', padding: '0 20px', fontSize: 'var(--text-base)' },
  lg: { minHeight: 'var(--control-h-lg)', padding: '0 24px', fontSize: 'var(--text-lg)' },
  sm: { minHeight: '40px', padding: '0 16px', fontSize: 'var(--text-md)' },
};
const VARIANTS = {
  primary: { background: 'var(--action-primary)', color: 'var(--action-on-primary)', border: '1px solid var(--action-primary)' },
  secondary: { background: 'var(--surface-card)', color: 'var(--text-strong)', border: '1px solid var(--border-input)' },
  inverse: { background: 'var(--fog-100)', color: 'var(--ink-900)', border: '1px solid var(--fog-100)' },
  outlineOnPhoto: { background: 'transparent', color: '#FFFFFF', border: '1px solid var(--border-on-photo)' },
  link: { background: 'transparent', color: 'var(--text-strong)', border: '0', textDecoration: 'underline', padding: 0, minHeight: 'var(--hit-min)' },
};

export function Button({ variant = 'primary', size = 'md', fullWidth = false, disabled = false, href, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const hoverStyle = hover && !disabled ? (variant === 'primary' ? { background: 'var(--action-primary-hover)', borderColor: 'var(--action-primary-hover)' } : variant === 'secondary' ? { borderColor: 'var(--ink-900)' } : {}) : {};
  const s = {
    fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', lineHeight: 1.2,
    borderRadius: 'var(--radius-sm)', cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    textDecoration: 'none', boxSizing: 'border-box', width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.4 : 1, transition: 'background var(--duration-fade) var(--ease-standard), border-color var(--duration-fade) var(--ease-standard)',
    ...SIZES[size], ...v, ...hoverStyle, ...style,
  };
  const Tag = href ? 'a' : 'button';
  return (
    <Tag href={href} type={href ? undefined : 'button'} disabled={href ? undefined : disabled} aria-disabled={disabled || undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={s} {...rest}>{children}</Tag>
  );
}
