/**
 * Text input or textarea with a small muted label above.
 * @startingPoint section="Forms" subtitle="Input, textarea, chips, checkbox, segmented switch" viewport="700x420"
 */
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  /** Rounded pill shape, used for the chat composer */
  pill?: boolean;
  inputStyle?: React.CSSProperties;
}
export function TextField(props: TextFieldProps): JSX.Element;
