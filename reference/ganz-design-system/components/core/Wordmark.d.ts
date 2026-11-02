/** The ganz wordmark, set in type. There is no logo file. */
export interface WordmarkProps {
  /** Font size in px. Header 24, app 26, slides 64. */
  size?: number;
  inverse?: boolean;
  style?: React.CSSProperties;
}
export function Wordmark(props: WordmarkProps): JSX.Element;
