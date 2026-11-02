import { de } from '@/i18n/de';

import type { RetailerState } from '../lib/state';

const tone: Record<RetailerState, string> = {
  neu: 'accent',
  angenommen: '',
  rueckfrage: 'ink',
  beantwortet: 'accent',
  entschieden: '',
  abgeschlossen: 'muted',
  widerrufen: 'muted',
};

export function StateChip({ state }: { state: RetailerState }) {
  return (
    <span className={`chip ${tone[state]}`}>
      {state === 'neu' || state === 'beantwortet' ? <span className="dot" aria-hidden /> : null}
      {de.portal.state[state]}
    </span>
  );
}
