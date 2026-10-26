import * as React from 'react';
/**
 * Primary action control. One primary per view; secondary for the alternative path.
 * @startingPoint section="Core" subtitle="Primary, secondary, inverse and link buttons" viewport="700x300"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink fill; secondary = white with stone border; inverse = light fill on dark/photo; outlineOnPhoto = white outline on photo; link = underlined text */
  variant?: 'primary' | 'secondary' | 'inverse' | 'outlineOnPhoto' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  /** Renders an <a> when set */
  href?: string;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
