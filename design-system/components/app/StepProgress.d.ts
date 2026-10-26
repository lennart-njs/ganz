/** Segmented progress for step-by-step guides. */
export interface StepProgressProps { total?: number; /** zero-based */ current?: number; style?: React.CSSProperties; }
export function StepProgress(props: StepProgressProps): JSX.Element;
