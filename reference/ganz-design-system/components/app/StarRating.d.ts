/** Five-star rating, ink filled, stone empty. 48px targets. */
export interface StarRatingProps { value?: number; onChange?: (n: number) => void; style?: React.CSSProperties; }
export function StarRating(props: StarRatingProps): JSX.Element;
