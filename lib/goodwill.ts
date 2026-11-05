// Kulanz mit Betrag als Zeile wie ein Beleg: „Fründ übernimmt 180 €, du zahlst 64 €.“ Gleich in
// der App (Gespräch) und im Portal (was die Kundschaft gelesen hat). Ohne React, ohne Store.
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { goodwillShare } from '@/model/sharing';

export function goodwillLine(
  dealer: string,
  payload: Readonly<Record<string, unknown>>,
): string | undefined {
  const share = goodwillShare(payload);
  if (!share) return undefined;
  const t = de.sharing.goodwill;
  // Auch bei vollem Betrag als Beleg mit „du zahlst 0 €“: keine Kostenzusage in Worten
  if (share.rest === undefined) return t.upTo(dealer, formatEuro(share.cover));
  return t.split(dealer, formatEuro(share.cover), formatEuro(share.rest));
}
