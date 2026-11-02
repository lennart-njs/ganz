/** Vertical case timeline. Filled dot = done, hollow = upcoming. */
export interface TimelineItem { when: string; what: React.ReactNode; pending?: boolean; }
export interface TimelineProps { items: TimelineItem[]; style?: React.CSSProperties; }
export function Timeline(props: TimelineProps): JSX.Element;
