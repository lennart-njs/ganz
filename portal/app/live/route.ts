// Puls für die Live-Aktualisierung: eine Prüfsumme über alle Fälle und die jüngste Aktivität der
// Kundschaft. Keine Inhalte außer Fallnummer und Name für den Hinweis.
import { listCases } from '../../lib/api';

export const dynamic = 'force-dynamic';

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export async function GET() {
  const { cases } = await listCases();
  const sig = hash(
    cases
      .map((r) =>
        [
          r.file.caseId,
          r.file.updatedAt,
          r.retailerEvents.length,
          r.file.messages?.length ?? 0,
          r.file.answers.length,
          r.notes?.length ?? 0,
          r.workflow?.status,
          r.workflow?.assigneeId,
          r.revokedAt ?? '',
        ].join(','),
      )
      .join('|'),
  );
  // Jüngste Aktivität der Kundschaft: neuer Fall oder neue Nachricht
  const latest = cases
    .filter((r) => !r.revokedAt)
    .map((r) => {
      const msg = [...(r.file.messages ?? []), ...r.file.answers]
        .map((m) => m.at)
        .sort()
        .at(-1);
      const kind: 'fall' | 'nachricht' = msg && msg > r.file.sharedAt ? 'nachricht' : 'fall';
      return {
        caseId: r.file.caseId,
        who: r.file.customer.name,
        at: kind === 'nachricht' ? msg! : r.file.sharedAt,
        kind,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  return Response.json({ sig, latest }, { headers: { 'Cache-Control': 'no-store' } });
}
