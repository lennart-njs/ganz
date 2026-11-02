/** Chat message. User = ink bubble right, ganz = white bubble left with name label. */
export interface ChatBubbleProps {
  from?: 'user' | 'ganz';
  children?: React.ReactNode;
  /** Small second line, e.g. "Foto vom Sieb angehängt" */
  note?: string;
  style?: React.CSSProperties;
}
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
