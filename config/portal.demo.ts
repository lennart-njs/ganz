// Demo-Werte für das Händlerportal (Entscheidungen 33 bis 37). Alles erfunden außer dem Namen Fründ
// und den Städten (Entscheidung 17, 21). Eigene Datei neben demo.config.ts, weil es viele Werte sind.
import type { DeviceCategory } from '@/model/types';
import type { DealerSettings } from '@/model/portal';

import { demoConfig } from './demo.config';

const fruend = demoConfig.dealers.find((d) => d.id === 'fruend')!;

/** Team von Fründ in der Demo. Die Anmeldung (demo@fruend.example) ist Sandra K. */
const team: DealerSettings['team'] = [
  {
    id: 'tb',
    name: 'Thomas B.',
    role: 'leitung',
    email: 'thomas.b@fruend.example',
    branchId: 'loehne',
    active: true,
  },
  {
    id: 'sk',
    name: 'Sandra K.',
    role: 'sachbearbeitung',
    email: 'demo@fruend.example',
    branchId: 'loehne',
    active: true,
  },
  {
    id: 'lw',
    name: 'Lea W.',
    role: 'sachbearbeitung',
    email: 'lea.w@fruend.example',
    branchId: 'minden',
    active: true,
  },
  {
    id: 'mt',
    name: fruend.service!.expert,
    role: 'technik',
    email: 'markus.t@fruend.example',
    branchId: 'bad-oeynhausen',
    active: true,
  },
  {
    id: 'jr',
    name: 'Jonas R.',
    role: 'technik',
    email: 'jonas.r@fruend.example',
    branchId: 'minden',
    active: true,
  },
  { id: 'ah', name: 'Anna H.', role: 'lesen', email: 'anna.h@fruend.example', active: false },
];

/** Standardeinstellungen für Fründ in der Demo */
export const fruendSettings: DealerSettings = {
  profile: {
    name: fruend.name,
    shortName: fruend.shortName,
    email: 'service@fruend.example',
    phone: '05732 000 00-0',
    website: 'fruend.example',
    branches: [
      {
        id: 'loehne',
        name: 'Löhne',
        street: 'Beispielstraße 1',
        zip: '32584',
        city: 'Löhne',
        phone: '05732 000 00-0',
      },
      {
        id: 'bad-oeynhausen',
        name: 'Bad Oeynhausen',
        street: 'Musterweg 12',
        zip: '32545',
        city: 'Bad Oeynhausen',
        phone: '05731 000 00-0',
      },
      {
        id: 'minden',
        name: 'Minden',
        street: 'Probeallee 3',
        zip: '32423',
        city: 'Minden',
        phone: '0571 000 00-0',
      },
    ],
    hours: { days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '18:00' },
  },
  messages: {
    greeting: {
      enabled: true,
      text: 'Hallo {kunde}, danke für deinen Fall {fall}. Wir schauen uns alles an und melden uns hier. Dein Team von {haendler}',
    },
    away: {
      enabled: true,
      text: 'Gerade ist unser Service nicht besetzt. Wir antworten am nächsten Werktag ab 8 Uhr. Bei Wasser oder Brandgeruch: Stecker ziehen, Wasserhahn zu.',
    },
    templates: [
      {
        id: 'beleg',
        title: 'Kaufbeleg anfordern',
        text: 'Kannst du uns ein Foto vom Kaufbeleg schicken? Das geht hier über die Kamera.',
      },
      {
        id: 'gewaehrleistung',
        title: 'Gewährleistung bestätigt',
        text: 'Gute Nachricht: Dein Gerät ist noch in der Gewährleistung. Wir kümmern uns um die Reparatur.',
      },
      {
        id: 'termin',
        title: 'Termin vereinbaren',
        text: 'Unser Kundendienst kommt zu dir. Wähl bitte unten ein Zeitfenster.',
      },
      {
        id: 'teil',
        title: 'Ersatzteil bestellt',
        text: 'Das Ersatzteil ist bestellt. Sobald es da ist, melden wir uns mit einem Termin.',
      },
      {
        id: 'foto',
        title: 'Weiteres Foto',
        text: 'Schick uns bitte noch ein Foto von der Stelle, um die es geht. Nah dran und mit Licht.',
      },
      {
        id: 'abschluss',
        title: 'Abschluss',
        text: 'Die Reparatur ist abgeschlossen. Läuft alles wieder? Dann schließen wir den Fall.',
      },
    ],
    questions: [
      {
        id: 'beleg',
        question: 'Hast du den Kaufbeleg noch?',
        options: ['Ja, ich schicke ein Foto', 'Nein'],
      },
      {
        id: 'zuhause',
        question: 'Ist jemand zu Hause, wenn der Kundendienst kommt?',
        options: ['Ja', 'Nein, bitte Schlüssel abholen'],
      },
      { id: 'laeuft', question: 'Läuft das Gerät wieder?', options: ['Ja', 'Nein'] },
    ],
  },
  team,
  rules: {
    autoAccept: false,
    autoAssign: [
      { category: 'geschirrspueler' as DeviceCategory, assigneeId: 'sk' },
      { category: 'waschmaschine' as DeviceCategory, assigneeId: 'lw' },
      { category: 'trockner' as DeviceCategory, assigneeId: 'lw' },
      { category: 'kuehlschrank' as DeviceCategory, assigneeId: 'sk' },
    ],
    requestProof: true,
    warrantyMonths: 24,
    goodwillMonths: 6,
    goodwillMaxCents: 15000,
    slaFirstHours: 4,
    slaReplyHours: 24,
  },
  service: {
    ownService: true,
    serviceName: fruend.service!.name,
    zipPrefixes: ['325', '324', '320'],
    slots: [...demoConfig.slots],
    prices: { travelCents: 4900, hourCents: 8900 },
    partners: demoConfig.partners.map((p) => ({ name: p.name, authorized: p.authorized })),
    savings: { visitCents: 12900, returnCents: 8500 },
  },
  notifications: {
    newCase: { email: true, push: true },
    overdue: { email: true, push: false },
    customerReply: { email: false, push: true },
    dailyReport: true,
    recipients: 'service@fruend.example',
  },
  privacy: { retentionMonths: 36, avvSignedAt: '2026-10-28T10:00:00+01:00', accessLog: true },
  integrations: {
    sap: 'verbunden',
    googlecalendar: 'verbunden',
    dhl: 'verbunden',
    whatsapp: 'getrennt',
  },
};

/** Demo-Anmeldung: wer im Portal angemeldet ist */
export const portalLogin = { email: 'demo@fruend.example', memberId: 'sk', dealerId: 'fruend' };

/** Beispiel für die Vorschau unter Einstellungen → Nachrichten, für {kunde} und {fall} */
export const messagePreview = { customer: 'Robin', caseNumber: 'GS-24816' };

/** Bausteine für die Beispielfälle im Portal (server/backend/seed.ts) */
export const portalSeed = {
  /** So viele Fälle mit Weitergabe und so viele anonyme Fälle (Auswertung) */
  cases: 42,
  anonymous: 168,
  /** Zeitraum in Tagen */
  days: 84,
  customers: [
    'Robin K.',
    'Alex M.',
    'Maria S.',
    'Jonas P.',
    'Lena H.',
    'Paul W.',
    'Sophie B.',
    'Tim R.',
    'Clara F.',
    'Ben L.',
    'Mia D.',
    'Felix N.',
    'Emma G.',
    'Lukas Z.',
    'Hanna V.',
    'Noah E.',
    'Lina T.',
    'David O.',
    'Marie J.',
    'Elias U.',
    'Ida Q.',
    'Leon Y.',
    'Nora C.',
    'Jan A.',
  ],
  streets: [
    'Lindenweg',
    'Am Markt',
    'Bergstraße',
    'Gartenstraße',
    'Mühlenweg',
    'Kirchplatz',
    'Ringstraße',
    'Bahnhofstraße',
  ],
  cities: [
    { zip: '32584', city: 'Löhne' },
    { zip: '32545', city: 'Bad Oeynhausen' },
    { zip: '32423', city: 'Minden' },
    { zip: '32052', city: 'Herford' },
  ],
  /** Geräte ohne Anleitung im Katalog */
  otherDevices: [
    {
      manufacturer: 'Miele',
      model: 'KFN 4795 DD',
      category: 'kuehlschrank' as DeviceCategory,
      problem: 'Kühlt nicht mehr richtig',
    },
    {
      manufacturer: 'Bosch',
      model: 'WTH85V00',
      category: 'trockner' as DeviceCategory,
      problem: 'Wäsche bleibt feucht',
    },
  ],
  /** Nachrichten in den Beispielfällen */
  dealerMessages: [
    'Danke für die Fotos. Das sieht nach der Laugenpumpe aus. Wir prüfen die Gewährleistung.',
    'Wir haben den Fall an unseren Kundendienst gegeben.',
    'Das Ersatzteil ist heute angekommen. Passt dir einer der Termine?',
    'Kurze Frage: Ist das Gerät fest eingebaut oder freistehend?',
  ],
  customerMessages: [
    'Danke, ich warte auf eure Nachricht.',
    'Das Gerät ist freistehend.',
    'Der Kaufbeleg kommt gleich als Foto.',
    'Dienstag passt gut, ich bin den ganzen Tag da.',
    'Es läuft wieder, danke.',
  ],
  notes: [
    'Kunde bereits zweimal angerufen, bitte zügig melden.',
    'Kaufbeleg in SAP gefunden, Beleg-Nr. passt.',
    'Teil beim Hersteller bestellt, Lieferzeit laut Großhandel 3 Tage.',
    'Kulanz mit Thomas abgestimmt.',
  ],
  parts: ['Laugenpumpe', 'Türdichtung', 'Zulaufschlauch mit Waterproof', 'Heizelement'],
};
