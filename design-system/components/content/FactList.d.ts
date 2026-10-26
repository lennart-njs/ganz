/** Two-column label/value list. The core pattern of the Fallakte (case file). */
export interface FactListProps {
  /** [label, value] pairs */
  items: Array<[React.ReactNode, React.ReactNode]>;
  labelWidth?: number;
  dense?: boolean;
  /** Hairline between rows */
  ruled?: boolean;
  style?: React.CSSProperties;
}
export function FactList(props: FactListProps): JSX.Element;
