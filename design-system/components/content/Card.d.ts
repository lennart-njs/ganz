/**
 * Flat container, 14px radius, no border. Optional photo on top. Shadow only when floating over a photo or colour field.
 * @startingPoint section="Content" subtitle="Cards, fact lists, timeline, nav rows" viewport="700x460"
 */
export interface CardProps {
  tone?: 'white' | 'sunken' | 'inverse';
  padding?: number | string;
  /** Image URL or node shown edge-to-edge on top */
  media?: string | React.ReactNode;
  mediaRatio?: string;
  /** Adds the float shadow. Only over photos. */
  float?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;
export function CardTitle(props: { children?: React.ReactNode; size?: number }): JSX.Element;
export function CardText(props: { children?: React.ReactNode }): JSX.Element;
