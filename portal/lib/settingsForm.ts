// Formulare der Einstellungen → Abschnitt der Einstellungen. Das Backend prüft danach noch einmal.
import { parseOptions, type DealerSettings, type SettingsSection } from '@/model/portal';
import type { DeviceCategory } from '@/model/types';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const on = (f: FormData, k: string) => f.get(k) === 'on';
const int = (f: FormData, k: string, fallback: number) => {
  const n = Number(str(f, k).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};
const cents = (f: FormData, k: string, fallback: number) => {
  const n = Number(str(f, k).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : fallback;
};
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `x-${Date.now().toString(36)}`;

/** Zeilen einer Liste: name="prefix.0.feld", …; leere neue Zeilen und „Entfernen“ fallen weg */
function rows(f: FormData, prefix: string): Record<string, string>[] {
  const idx = new Set<number>();
  for (const k of f.keys()) {
    const m = new RegExp(`^${prefix}\\.(\\d+)\\.`).exec(k);
    if (m) idx.add(Number(m[1]));
  }
  return [...idx]
    .sort((a, b) => a - b)
    .map((i) => {
      const row: Record<string, string> = {};
      for (const [k, v] of f.entries()) {
        const p = `${prefix}.${i}.`;
        if (k.startsWith(p)) row[k.slice(p.length)] = String(v).trim();
      }
      return row;
    })
    .filter((r) => r.remove !== 'on');
}

export function sectionFromForm(section: SettingsSection, f: FormData, s: DealerSettings): unknown {
  switch (section) {
    case 'profile':
      return {
        ...s.profile,
        name: str(f, 'name'),
        shortName: str(f, 'shortName'),
        email: str(f, 'email'),
        phone: str(f, 'phone'),
        website: str(f, 'website'),
        hours: {
          days: f
            .getAll('days')
            .map(Number)
            .filter((d) => d >= 1 && d <= 7),
          from: str(f, 'from') || s.profile.hours.from,
          to: str(f, 'to') || s.profile.hours.to,
        },
        branches: rows(f, 'branch')
          .filter((r) => r.name)
          .map((r) => ({
            id: r.id || slug(r.name!),
            name: r.name!,
            street: r.street ?? '',
            zip: r.zip ?? '',
            city: r.city ?? '',
            phone: r.phone ?? '',
          })),
      };
    case 'messages':
      return {
        greeting: { enabled: on(f, 'greeting.enabled'), text: str(f, 'greeting.text') },
        away: { enabled: on(f, 'away.enabled'), text: str(f, 'away.text') },
        templates: rows(f, 'template')
          .filter((r) => r.title && r.text)
          .map((r) => ({ id: r.id || slug(r.title!), title: r.title!, text: r.text! })),
        questions: rows(f, 'question')
          .filter((r) => r.question)
          .map((r) => ({
            id: r.id || slug(r.question!),
            question: r.question!,
            options: parseOptions(r.options ?? ''),
          })),
      };
    case 'team':
      return rows(f, 'member')
        .filter((r) => r.name)
        .map((r) => ({
          id: r.id || slug(r.name!),
          name: r.name!,
          role: (['leitung', 'sachbearbeitung', 'technik', 'lesen'].includes(r.role ?? '')
            ? r.role
            : 'sachbearbeitung') as DealerSettings['team'][number]['role'],
          email: r.email ?? '',
          ...(r.branchId ? { branchId: r.branchId } : {}),
          active: r.active === 'on',
        }));
    case 'rules':
      return {
        ...s.rules,
        autoAccept: on(f, 'autoAccept'),
        requestProof: on(f, 'requestProof'),
        autoAssign: f
          .getAll('assignCategory')
          .map(String)
          .flatMap((category) => {
            const id = str(f, `assign.${category}`);
            return id ? [{ category: category as DeviceCategory, assigneeId: id }] : [];
          }),
        // Gesetzlich, nicht einstellbar: bleibt, wie es ist
        warrantyMonths: s.rules.warrantyMonths,
        goodwillMonths: int(f, 'goodwillMonths', s.rules.goodwillMonths),
        goodwillMaxCents: cents(f, 'goodwillMax', s.rules.goodwillMaxCents),
        slaFirstHours: int(f, 'slaFirstHours', s.rules.slaFirstHours),
        slaReplyHours: int(f, 'slaReplyHours', s.rules.slaReplyHours),
      };
    case 'service':
      return {
        ownService: on(f, 'ownService'),
        serviceName: str(f, 'serviceName'),
        zipPrefixes: str(f, 'zipPrefixes')
          .split(/[,\s]+/)
          .filter(Boolean),
        slots: str(f, 'slots')
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 12),
        prices: {
          travelCents: cents(f, 'travel', s.service.prices.travelCents),
          hourCents: cents(f, 'hour', s.service.prices.hourCents),
        },
        partners: rows(f, 'partner')
          .filter((r) => r.name)
          .map((r) => ({ name: r.name!, authorized: r.authorized === 'on' })),
        savings: {
          visitCents: cents(f, 'visit', s.service.savings.visitCents),
          returnCents: cents(f, 'return', s.service.savings.returnCents),
        },
      };
    case 'notifications':
      return {
        newCase: { email: on(f, 'newCase.email'), push: on(f, 'newCase.push') },
        overdue: { email: on(f, 'overdue.email'), push: on(f, 'overdue.push') },
        customerReply: { email: on(f, 'customerReply.email'), push: on(f, 'customerReply.push') },
        dailyReport: on(f, 'dailyReport'),
        recipients: str(f, 'recipients'),
      };
    case 'privacy':
      return {
        ...s.privacy,
        retentionMonths: int(f, 'retentionMonths', s.privacy.retentionMonths),
        accessLog: on(f, 'accessLog'),
      };
    case 'integrations': {
      const key = str(f, 'key');
      const value = str(f, 'value') === 'verbunden' ? 'verbunden' : 'getrennt';
      return { ...s.integrations, [key]: value };
    }
  }
}

/** Adressen der Einstellungen: /einstellungen/profil, … */
export const sectionSlugs: Record<SettingsSection, string> = {
  profile: 'profil',
  messages: 'nachrichten',
  team: 'team',
  rules: 'regeln',
  service: 'kundendienst',
  notifications: 'benachrichtigungen',
  privacy: 'datenschutz',
  integrations: 'schnittstellen',
};
