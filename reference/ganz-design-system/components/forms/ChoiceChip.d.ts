/** Single-select chip. Selected = ink fill. Optional second line for time slots. */
export interface ChoiceChipProps {
  selected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  /** Second line, e.g. "10–12 Uhr" */
  sub?: string;
  style?: React.CSSProperties;
}
export function ChoiceChip(props: ChoiceChipProps): JSX.Element;
