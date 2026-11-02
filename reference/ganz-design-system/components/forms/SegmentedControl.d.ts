/** Audience switcher (Zu Hause / Hersteller & Handel / Fachbetriebe). */
export interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
