/** Tappable row with title, optional subline and chevron. For alternative paths and linked cases. */
export interface NavRowProps {
  title: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: () => void;
  /** white = bordered on page; sunken = stone fill inside a white card */
  tone?: 'white' | 'sunken';
  style?: React.CSSProperties;
}
export function NavRow(props: NavRowProps): JSX.Element;
