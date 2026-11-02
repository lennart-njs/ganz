/**
 * App top bar (back chevron + centred title) and sticky bottom action bar.
 * @startingPoint section="App" subtitle="Header, chat, steps, toast, rating" viewport="700x520"
 */
export interface AppHeaderProps { title?: string; onBack?: () => void; style?: React.CSSProperties; }
export function AppHeader(props: AppHeaderProps): JSX.Element;
export interface BottomBarProps { children?: React.ReactNode; style?: React.CSSProperties; }
export function BottomBar(props: BottomBarProps): JSX.Element;
