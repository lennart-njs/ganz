/** Full-width confirmation row with a square check. Used for safety and consent confirmations. */
export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
