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

/**
 * Demo-Anmeldung: wer im Portal angemeldet ist. Das Passwort gilt nur in der Entwicklung
 * (`npx expo start`) oder mit PORTAL_DEMO_LOGIN=1. PORTAL_DEMO_PASSWORD ersetzt es
 * (server/backend/auth.ts).
 */
export const portalLogin = {
  email: 'demo@fruend.example',
  memberId: 'sk',
  dealerId: 'fruend',
  demoPassword: 'demo',
};

/** Beispiel für die Vorschau unter Einstellungen → Nachrichten, für {kunde} und {fall} */
export const messagePreview = { customer: 'Robin', caseNumber: 'GS-24816' };

/** Bausteine für die Beispielfälle im Portal (server/backend/seed.ts) */
export const portalSeed = {
  /** So viele Fälle mit Weitergabe und so viele anonyme Fälle (Auswertung) */
  cases: 42,
  anonymous: 168,
  /** Zeitraum in Tagen */
  days: 84,
  /** Ein Name je Fall, keiner doppelt */
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
    'Greta W.',
    'Theo K.',
    'Frieda L.',
    'Mats B.',
    'Ronja S.',
    'Jakob H.',
    'Wiebke R.',
    'Henri P.',
    'Malte F.',
    'Merle T.',
    'Ole D.',
    'Paula Z.',
    'Fiete O.',
    'Lotta U.',
    'Carla N.',
    'Moritz E.',
    'Smilla G.',
    'Hauke M.',
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
  /** Wann die Kundschaft in den Beispielfällen schreibt. Fründ antwortet in seinen Öffnungszeiten. */
  customerHours: { days: [1, 2, 3, 4, 5, 6, 7], from: '07:00', to: '22:30' },
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
  /**
   * Probleme in den Beispielfällen. labels: das Problem, wie es in der App heißt. ablauf: der
   * Wasserablauf, dazu gibt es die Anleitung aus dem Katalog. weight: wie oft je Gerät. finding:
   * Der Befund aus dem Videocall (de.appliance) passt dazu. details: was die Kundschaft dazu schreibt.
   */
  issues: [
    {
      key: 'ablauf',
      labels: ['Wasser bleibt stehen', 'Wasser bleibt in der Trommel'],
      ablauf: true,
      weight: 4,
      part: 'Laugenpumpe',
      finding: true,
      details: [
        'Das Wasser steht seit gestern Abend im Gerät.',
        'Man hört die Pumpe kurz brummen, dann passiert nichts mehr.',
        'Das ist diese Woche schon das zweite Mal.',
      ],
    },
    {
      key: 'elektronik',
      labels: [
        'Bedienfeld bleibt dunkel',
        'Alle Anzeigen leuchten oder blinken',
        'Maschine startet nicht',
      ],
      weight: 1,
      part: 'Elektronikmodul',
      details: [
        'Die Sicherung habe ich geprüft, die ist in Ordnung.',
        'Stecker ziehen und wieder einstecken hilft nicht.',
      ],
    },
    {
      key: 'zulauf',
      labels: ['Maschine zieht kein Wasser'],
      weight: 2,
      part: 'Zulaufschlauch mit Waterproof',
      details: [
        'Der Wasserhahn ist offen. Trotzdem kommt kein Wasser.',
        'Das Programm bricht nach ein paar Minuten ab.',
      ],
    },
    {
      key: 'dichtung',
      labels: ['Wasser am Laugenfilter'],
      weight: 2,
      part: 'Dichtung am Laugenfilter',
      details: [
        'Nach jeder Wäsche steht eine kleine Pfütze vor der Maschine.',
        'Den Filter habe ich fest zugedreht. Es tropft trotzdem.',
      ],
    },
    {
      key: 'verriegelung',
      labels: ['Tür geht nicht auf'],
      weight: 2,
      part: 'Türverriegelung',
      details: [
        'Die Wäsche ist seit gestern in der Maschine.',
        'Das Programm ist durch, die Tür bleibt trotzdem zu.',
      ],
    },
    {
      key: 'stossdaempfer',
      labels: ['Maschine wackelt oder wandert'],
      weight: 1,
      part: 'Stoßdämpfer',
      details: [
        'Beim Schleudern wandert sie fast zehn Zentimeter.',
        'Ausgerichtet ist sie, die Füße sind fest.',
      ],
    },
    {
      key: 'fuehler',
      labels: ['Kühlt nicht mehr richtig'],
      weight: 4,
      part: 'Temperaturfühler',
      finding: true,
      details: [
        'Im Kühlteil sind es nur noch 12 Grad.',
        'Die Milch ist nach einem Tag sauer.',
        'Das Gefrierteil ist kalt, nur oben wird es warm.',
      ],
    },
    {
      key: 'luefter',
      labels: ['Brummt oder klackt laut'],
      weight: 2,
      part: 'Lüfter',
      details: [
        'Das Klacken kommt etwa alle zehn Minuten, auch nachts.',
        'Das Brummen ist seit zwei Tagen deutlich lauter.',
      ],
    },
    {
      key: 'abtau',
      labels: ['Eis an der Rückwand'],
      weight: 1,
      part: 'Abtauheizung',
      details: [
        'Die Eisschicht ist schon fast zwei Zentimeter dick.',
        'Abgetaut habe ich vor einer Woche. Jetzt ist das Eis wieder da.',
      ],
    },
    {
      key: 'kondensat',
      labels: ['Wäsche bleibt feucht', 'Programm bricht ab'],
      weight: 2,
      part: 'Kondensatpumpe',
      finding: true,
      details: [
        'Der Wasserbehälter bleibt leer, die Wäsche ist danach noch nass.',
        'Nach einer halben Stunde bricht das Programm ab.',
      ],
    },
    {
      key: 'heizung',
      labels: ['Trockner wird nicht warm'],
      weight: 2,
      part: 'Heizelement',
      details: [
        'Die Trommel dreht sich, aber die Luft bleibt kalt.',
        'Nach zwei Stunden ist die Wäsche noch genauso nass.',
      ],
    },
  ],
  /** Gespräche in den Beispielfällen. Fründ duzt die Kundschaft, wie in der App. */
  talk: {
    /** Antwort, wenn der Kaufbeleg fehlt. branch: Filiale */
    noProof: (branch: string) =>
      `Der Beleg ist leider weg. Gekauft habe ich das Gerät bei euch in ${branch}.`,
    /** Kein Zeitfenster passt */
    otherTime: 'Die Zeiten passen bei mir leider nicht. Geht es auch Donnerstag nach 16 Uhr?',
    /** Nach „Das können wir leider nicht übernehmen.“ */
    cost: 'Schade. Was würde eine Reparatur ungefähr kosten?',
    /** Das Ersatzteil ist überfällig */
    partLate: 'Gibt es schon etwas Neues zum Ersatzteil?',
    /** Nach „Das läuft über deine Versicherung.“ */
    insurer: 'Muss ich mich selbst bei der Versicherung melden?',
    /** Für den Einsatz des Kundendienstes */
    builtIn: {
      question: 'Ist das Gerät eingebaut oder freistehend?',
      options: ['Eingebaut', 'Freistehend'],
    },
    /** Mit dem Terminvorschlag, wenn das Ersatzteil da ist */
    partWithTech: 'Unser Techniker bringt das Teil mit. Der Einbau dauert etwa eine Stunde.',
    /** Nach einer Ablehnung */
    offerOrNew: {
      question: 'Sollen wir dir ein Angebot für die Reparatur machen oder ein neues Gerät zeigen?',
      options: ['Angebot für die Reparatur', 'Neues Gerät'],
    },
    newDevice:
      'Gern. Komm einfach in einer unserer Filialen vorbei. Das alte Gerät nehmen wir bei der Lieferung mit.',
    /** Nach der Bestätigung des Termins. day: Wochentag des Termins, z. B. „Montag“ */
    afterBooking: [
      (day: string) => `Danke, dann bis ${day}.`,
      (_day: string) => 'Bitte vorher kurz anrufen. Die Klingel geht nicht.',
      (day: string) => `${day} passt gut, ich bin den ganzen Tag da.`,
    ],
    /** Nach der Reparatur */
    works: [
      'Läuft wieder, danke.',
      'Alles wieder gut. Danke für die schnelle Hilfe.',
      'Funktioniert wieder einwandfrei.',
    ],
    /** Nach der Weitergabe an die Versicherung */
    ok: ['Alles klar, danke.', 'Okay, danke für die Info.', 'Gut, dann warte ich auf den Anruf.'],
  },
  /** Interne Notizen in den Beispielfällen */
  notes: {
    kulanz: 'Kulanz mit Thomas abgestimmt.',
    sap: 'Kaufbeleg in SAP gefunden, Beleg-Nr. passt.',
    part: (days: number) =>
      `Teil beim Hersteller bestellt, Lieferzeit laut Großhandel ${days} Tage.`,
    called: 'Hat schon zweimal angerufen, bitte heute melden.',
    bell: 'Klingel defekt, vor dem Termin anrufen.',
    insurer: 'Schaden an die Versicherung gemeldet.',
  },
  /** Ersatzteile zur Auswahl im Portal */
  parts: [
    'Laugenpumpe',
    'Türdichtung',
    'Zulaufschlauch mit Waterproof',
    'Heizelement',
    'Kondensatpumpe',
    'Temperaturfühler',
    'Türverriegelung',
    'Elektronikmodul',
  ],
};
