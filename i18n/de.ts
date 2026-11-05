// Alle Texte der App. Platzhalter sind Funktionen.
// Glossar: docs/REVIEW.md Abschnitt 6.
import type { DataCategory } from '@/model/policies/consentScopes';

export const de = {
  app: {
    name: 'mach’s',
    // Die beiden Texte darunter liest Expo aus app.config.ts, ohne Bundler. Dort ist kein Import
    // von dieser Datei möglich. app.config.ts nennt sie darum noch einmal, und
    // __tests__/build/appConfig.test.ts prüft, dass beide gleich sind.
    /** Name unter dem App-Icon je Build-Variante. So lassen sich Builds auf einem Telefon unterscheiden. */
    variantName: {
      development: 'mach’s dev',
      pitch: 'mach’s pitch',
      production: 'mach’s',
    },
    /** Systemdialog vor dem ersten Foto (Plugin expo-camera) */
    cameraPermission:
      'mach’s nutzt die Kamera für Fotos von Display, Typenschild und Bauteil. Die Fotos bleiben in deinem Fall.',
  },
  a11y: {
    back: 'Zurück',
    close: 'Schließen',
    stepOf: (current: number, total: number) => `Schritt ${current} von ${total}`,
    starsOf: (n: number) => `${n} von 5 Sternen`,
    rating: 'Bewertung',
    expanded: 'aufgeklappt',
    collapsed: 'eingeklappt',
    photo: (label: string) => `Foto: ${label}`,
    timelinePending: 'offen',
    fact: (label: string, value: string) => `${label}: ${value}`,
    withSub: (title: string, sub?: string) => (sub ? `${title}, ${sub}` : title),
  },
  symbols: {
    star: '★',
  },
  ds: {
    attention: 'Achtung',
    expand: 'Aufklappen',
    collapse: 'Zuklappen',
    confidence: 'Sicherheit',
    confidenceLabel: (level: string) => `Sicherheit: ${level}`,
    confidenceLevel: {
      hoch: 'hoch',
      mittel: 'mittel',
      unsicher: 'unsicher',
    },
    photoPlaceholder: (label: string) => `Foto folgt: ${label}`,
  },
  tabs: {
    devices: 'Geräte',
    cases: 'Fälle',
    profile: 'Profil',
  },

  /** Titel der Screens (BUILD_PLAN Abschnitt 2) */
  screens: {
    willkommen: 'Willkommen',
    schutz: 'Schutz verknüpfen',
    haendler: 'Gekauft bei',
    geraetBestaetigen: 'Gerät bestätigen',
    geraete: 'Geräte',
    faelle: 'Fälle',
    profil: 'Profil',
    geraetDetail: 'Gerät',
    geraetNeu: 'Gerät hinzufügen',
    problem: 'Problem melden',
    meldungen: 'Meldung im Display',
    kamera: 'Foto machen',
    fotoFrage: 'Foto für den Assistenten',
    fotoHaendler: 'Foto für den Händler',
    analyse: 'Intelligente Fehlererkennung',
    rueckfrage: 'Rückfrage',
    ergebnis: 'Ergebnis',
    anleitung: 'Anleitung',
    hilfe: 'Hilfe holen',
    warteraum: 'Verbindung',
    videocall: 'Videocall',
    befund: 'Befund',
    kosten: 'Kosten und Schadenmeldung',
    termin: 'Betrieb und Termin',
    status: 'Fall-Status',
    abschluss: 'Abschluss',
    fallakte: 'Fallakte',
  },

  /** Status eines Falls, wie die Nutzerin ihn sieht */
  caseStatus: {
    offen: 'Offen',
    selbsthilfe: 'Anleitung läuft',
    eskaliert: 'Hilfe angefragt',
    freigabe_noetig: (insurer: string) => `Freigabe durch ${insurer}`,
    freigegeben: 'Kosten freigegeben',
    abgelehnt: 'Kosten nicht freigegeben',
    in_reparatur: 'Reparatur geplant',
    /** Gewährleistung: Der Betrieb bessert nach (Nr. 32) */
    nachbesserung: 'Nachbesserung',
    erledigt: 'Erledigt',
    abgebrochen: 'Abgebrochen',
  },

  /** Einträge der Fallakte (CaseEvent.type) */
  caseEvent: {
    fall_angelegt: 'Problem gemeldet',
    foto_aufgenommen: 'Foto aufgenommen',
    ergebnis_erkannt: 'Ergebnis der Intelligenten Fehlererkennung',
    rueckfrage_gestellt: 'Rückfrage gestellt',
    rueckfrage_beantwortet: 'Rückfrage beantwortet',
    anleitung_gestartet: 'Anleitung gestartet',
    schritt_erledigt: 'Schritt erledigt',
    schritt_zurueck: 'Schritt zurück',
    schritt_geht_nicht: 'Schritt ging nicht',
    sicherheit_bestaetigt: 'Sicherheitshinweis bestätigt',
    anleitung_beendet: 'Anleitung beendet',
    weitergabe_bestaetigt: 'Weitergabe bestätigt',
    einwilligung_widerrufen: 'Einwilligung widerrufen',
    videocall_angefragt: 'Videocall angefragt',
    videocall_gestartet: 'Videocall gestartet',
    videocall_beendet: 'Videocall beendet',
    befund_erstellt: 'Befund erstellt',
    angebot_erstellt: 'Kostenvoranschlag erstellt',
    schaden_gemeldet: 'Schadenfall gemeldet',
    freigabe_entschieden: 'Freigabe entschieden',
    termin_angefragt: 'Termin angefragt',
    preis_genannt: 'Preis genannt',
    zahlungspflichtig_gebucht: 'Zahlungspflichtig gebucht',
    nicht_gebucht: 'Nicht gebucht',
    termin_bestaetigt: 'Termin bestätigt',
    termin_abgesagt: 'Termin abgesagt',
    betrieb_unterwegs: 'Betrieb ist unterwegs',
    reparatur_abgeschlossen: 'Reparatur abgeschlossen',
    abschluss_bestaetigt: 'Läuft wieder',
    problem_besteht_weiter: 'Problem besteht weiter',
    nachbesserung_verlangt: 'Nachbesserung in der Gewährleistung',
    bewertet: 'Bewertet',
    pausiert: 'Später weitermachen',
    fortgesetzt: 'Fortgesetzt',
    abgebrochen: 'Fall abgebrochen',
    assistent_gefragt: 'Reparatur-Assistent gefragt',
    status_geaendert: 'Status geändert',
    haendler_angenommen: 'Händler hat den Fall angenommen',
    haendler_rueckfrage: 'Rückfrage vom Händler',
    haendler_entscheidung: 'Entscheidung des Händlers',
    haendler_betrieb: 'Händler hat einen Betrieb beauftragt',
    haendler_status: 'Stand vom Händler',
    haendler_nachricht: 'Nachricht vom Händler',
    haendler_termin: 'Terminvorschlag vom Händler',
    haendler_ersatzteil: 'Ersatzteil',
    nachricht_an_haendler: 'Nachricht an den Händler',
  },

  /**
   * Bezeichnungen der Datenkategorien aus model/policies/consentScopes.ts. Welche Kategorien eine
   * Weitergabe umfasst, steht nur dort (R-14). Die Bezeichnungen stehen in Listen und mitten im Satz.
   */
  dataCategory: {
    vertrag: 'Vertragsnummer',
    geraet: 'Gerät und Modell',
    typenschild: 'Typenschild-Nummern',
    seriennummer: 'Seriennummer',
    problem: 'Problem',
    ergebnis: 'Ergebnis',
    schritte: 'Schritte der Anleitung',
    notiz: 'Notizen zu diesem Fall',
    nachrichten: 'Nachrichten an den Assistenten',
    fotos: 'Fotos aus diesem Fall',
    standbilder: 'Standbilder aus dem Videocall',
    befund: 'Befund',
    kosten: 'Kostenvoranschlag',
    adresse: 'Adresse',
    schutz: 'Angabe, ob ein Schutz besteht',
    fallstand: 'Stand deiner Fälle',
    name: 'Name',
    kaufdatum: 'Kaufdatum',
    /**
     * Anbieter, Produkt und Laufzeit des Schutzes, mehr als die Angabe „schutz“. Ohne „und“: Die
     * Bezeichnung steht mitten in der Aufzählung vor „Ja, senden“ (haendler_weitergabe 2026-11-4).
     */
    versicherung: 'Schutz (Anbieter, Produkt, Laufzeit)',
    termin: 'Termin',
    verlauf: 'Verlauf des Falls',
    /** Auch die Antworten auf Rückfragen des Händlers, sie stehen im Gespräch mit ihm */
    nachrichten_haendler: 'Nachrichten an den Händler',
    bewertung: 'Bewertung des Betriebs',
    /** Teil von assistent_einwilligung 2026-11-4 (lib/legalTexts.ts). Nur mit neuer Version ändern. */
    gespraechsfotos: 'Fotos, die du im Gespräch für den Assistenten aufnimmst',
  } satisfies Record<DataCategory, string>,

  consentPurpose: {
    weitergabe_fachkraft: 'Weitergabe an die Fachkraft',
    weitergabe_versicherer: 'Weitergabe an den Versicherer',
    weitergabe_betrieb: 'Weitergabe an den Betrieb',
    weitergabe_haendler: 'Fall an den Händler',
    screenshots_im_call: 'Screenshots im Videocall',
    hersteller_einzelfall: 'Einzelfall an den Hersteller',
    mitteilungen: 'Mitteilungen',
    chat_assistent: 'Reparatur-Assistent',
  },

  deviceCategory: {
    waschmaschine: 'Waschmaschine',
    geschirrspueler: 'Geschirrspüler',
    trockner: 'Trockner',
    kuehlschrank: 'Kühlschrank',
  },

  /**
   * Texte je Gerätetyp. Die Anleitungen aus der Demo gibt es nur für die Waschmaschine.
   * Andere Geräte bekommen eigene Symptome und einen eigenen Beispielbefund, aber keine erfundene Anleitung.
   */
  appliance: {
    waschmaschine: {
      runsAgain: 'Läuft die Maschine wieder?',
      runsAgainAsk: 'Sag uns, ob die Maschine wieder läuft.',
      reachable: 'Bitte sorg dafür, dass die Maschine gut erreichbar ist.',
      typePlate: 'Bei geöffneter Tür oberhalb des Schauglases. Wir erkennen Modell und Baujahr.',
      otherPlaceholder: 'z. B. Die Maschine riecht verbrannt.',
      photoSelf: 'Waschmaschine läuft wieder',
      /** Waschmaschine: die Einstiege aus de.problems, jeweils mit Anleitung */
      symptoms: [] as { id: string; label: string; sub: string }[],
      finding: {
        component: 'Laugenpumpe',
        part: 'Original-Laugenpumpe',
        partAcc: 'die Original-Laugenpumpe',
        title: 'Die Laugenpumpe ist defekt.',
        text: 'Der Pumpenflügel blockiert. Die Pumpe wird getauscht, der Rest der Maschine ist in Ordnung.',
        callLine: 'Dreh bitte den Pumpenflügel mit dem Finger. Klemmt er?',
        solved: 'Die Maschine läuft wieder',
        repairSub: 'Der Betrieb bestellt die Original-Laugenpumpe und baut sie ein',
        repaired: (partner: string) => `${partner} hat die Laugenpumpe getauscht.`,
      },
    },
    geschirrspueler: {
      runsAgain: 'Läuft der Geschirrspüler wieder?',
      runsAgainAsk: 'Sag uns, ob der Geschirrspüler wieder läuft.',
      reachable: 'Bitte räum den Geschirrspüler aus, damit der Betrieb gut herankommt.',
      typePlate: 'Am Rand der geöffneten Tür, meist oben rechts. Wir erkennen Modell und Baujahr.',
      otherPlaceholder: 'z. B. Der Geschirrspüler pumpt nicht ab.',
      photoSelf: 'Geschirrspüler läuft wieder',
      symptoms: [
        {
          id: 'gs_wasser',
          label: 'Wasser bleibt stehen',
          sub: 'Unten im Gerät, nach dem Programm',
        },
        { id: 'gs_sauber', label: 'Geschirr wird nicht sauber', sub: 'Reste oder Beläge' },
        { id: 'gs_nass', label: 'Geschirr bleibt nass', sub: 'Am Programmende' },
        { id: 'gs_leck', label: 'Wasser läuft aus', sub: 'Pfütze vor dem Gerät' },
        { id: 'gs_start', label: 'Geschirrspüler startet nicht', sub: 'Display bleibt dunkel' },
      ],
      finding: {
        component: 'Laugenpumpe',
        part: 'Original-Laugenpumpe',
        partAcc: 'die Original-Laugenpumpe',
        title: 'Die Laugenpumpe ist defekt.',
        text: 'Das Flügelrad ist gebrochen, deshalb bleibt Wasser stehen. Die Pumpe wird getauscht, der Rest des Geschirrspülers ist in Ordnung.',
        callLine: 'Nimm bitte die Siebe unten heraus. Siehst du Glassplitter?',
        solved: 'Der Geschirrspüler läuft wieder',
        repairSub: 'Der Betrieb bestellt die Original-Laugenpumpe und baut sie ein',
        repaired: (partner: string) => `${partner} hat die Laugenpumpe getauscht.`,
      },
    },
    trockner: {
      runsAgain: 'Läuft der Trockner wieder?',
      runsAgainAsk: 'Sag uns, ob der Trockner wieder läuft.',
      reachable: 'Bitte sorg dafür, dass der Trockner gut erreichbar ist.',
      typePlate: 'Bei geöffneter Tür am Türrahmen. Wir erkennen Modell und Baujahr.',
      otherPlaceholder: 'z. B. Der Trockner riecht verbrannt.',
      photoSelf: 'Trockner läuft wieder',
      symptoms: [
        { id: 'tr_feucht', label: 'Wäsche bleibt feucht', sub: 'Auch nach langem Programm' },
        { id: 'tr_abbruch', label: 'Programm bricht ab', sub: 'Mitten im Trocknen' },
        { id: 'tr_kalt', label: 'Trockner wird nicht warm', sub: 'Trommel dreht sich' },
        { id: 'tr_trommel', label: 'Trommel dreht sich nicht', sub: 'Gerät brummt' },
        { id: 'tr_start', label: 'Trockner startet nicht', sub: 'Display bleibt dunkel' },
      ],
      finding: {
        component: 'Kondensatpumpe',
        part: 'Original-Kondensatpumpe',
        partAcc: 'die Original-Kondensatpumpe',
        title: 'Die Kondensatpumpe ist defekt.',
        text: 'Das Wasser wird nicht mehr abgepumpt, deshalb bricht das Programm ab. Die Pumpe wird getauscht, der Rest des Trockners ist in Ordnung.',
        callLine: 'Zieh bitte den Wasserbehälter heraus. Ist er voll?',
        solved: 'Der Trockner läuft wieder',
        repairSub: 'Der Betrieb bestellt die Original-Kondensatpumpe und baut sie ein',
        repaired: (partner: string) => `${partner} hat die Kondensatpumpe getauscht.`,
      },
    },
    kuehlschrank: {
      runsAgain: 'Kühlt der Kühlschrank wieder?',
      runsAgainAsk: 'Sag uns, ob der Kühlschrank wieder kühlt.',
      reachable: 'Bitte räum Lebensmittel, die schnell verderben, vorher in eine Kühltasche.',
      typePlate:
        'Innen an der Seitenwand, meist unten neben dem Gemüsefach. Wir erkennen Modell und Baujahr.',
      otherPlaceholder: 'z. B. Der Kühlschrank brummt sehr laut.',
      photoSelf: 'Kühlschrank kühlt wieder',
      symptoms: [
        { id: 'ks_kalt', label: 'Kühlt nicht mehr richtig', sub: 'Lebensmittel werden warm' },
        { id: 'ks_wasser', label: 'Wasser im Kühlteil', sub: 'Unten oder an der Rückwand' },
        { id: 'ks_eis', label: 'Eis an der Rückwand', sub: 'Dicke Schicht' },
        { id: 'ks_laut', label: 'Brummt oder klackt laut', sub: 'Immer wieder' },
        { id: 'ks_aus', label: 'Licht und Display aus', sub: 'Gerät ist still' },
      ],
      finding: {
        component: 'Temperaturfühler',
        part: 'Original-Temperaturfühler',
        partAcc: 'den Original-Temperaturfühler',
        title: 'Der Temperaturfühler ist defekt.',
        text: 'Der Kühlschrank misst falsch und kühlt deshalb zu wenig. Der Fühler wird getauscht, der Rest des Geräts ist in Ordnung.',
        callLine: 'Zeig mir bitte die Rückwand innen. Ist sie vereist?',
        solved: 'Der Kühlschrank kühlt wieder',
        repairSub: 'Der Betrieb bestellt den Original-Temperaturfühler und baut ihn ein',
        repaired: (partner: string) => `${partner} hat den Temperaturfühler getauscht.`,
      },
    },
  },

  partner: {
    authorized: (manufacturer: string) => `${manufacturer}-autorisiert`,
    independent: 'Freie Werkstatt',
    dealerService: 'Kundendienst deines Händlers',
    distance: (km: string) => `${km} km`,
  },

  /** Einstiege in „Problem melden“ (aus der Demo, Main.dc.html) */
  problems: [
    {
      id: 'meldung',
      label: 'Display zeigt eine Meldung',
      sub: 'z. B. Wasserablauf, Waterproof, Fehler F',
    },
    { id: 'nass', label: 'Wäsche ist noch nass', sub: 'Nicht richtig geschleudert' },
    { id: 'tuer', label: 'Tür geht nicht auf', sub: 'Nach oder während des Programms' },
    { id: 'wackelt', label: 'Maschine wackelt oder wandert', sub: 'Beim Schleudern' },
    { id: 'einspuel', label: 'Reste im Einspülkasten', sub: 'Waschmittel wird nicht eingespült' },
    { id: 'start', label: 'Maschine startet nicht', sub: 'Display bleibt dunkel' },
  ],

  /** Meldungen im Display (aus der Demo) */
  displayMessages: [
    { guideId: 'zulauf', code: 'Wasserzulauf', hint: 'Programm abgebrochen' },
    { guideId: 'ablauf', code: 'Wasserablauf', hint: 'Programm abgebrochen' },
    { guideId: 'waterproof', code: 'Waterproof', hint: 'Wasserschutz hat ausgelöst' },
    { guideId: 'fehlerf', code: 'Fehler F', hint: 'Defekt' },
    { guideId: 'verriegelung', code: 'Türverriegelung', hint: 'Tür rastet nicht ein' },
    { guideId: 'entriegelung', code: 'Türentriegelung', hint: 'Schloss blockiert' },
    { guideId: 'dosierung', code: 'Dosierung prüfen', hint: 'Am Programmende' },
    { guideId: 'hygiene', code: 'Hygiene-Info', hint: 'Am Programmende' },
  ],

  /** Pflege am Gerät (aus der Demo) */
  maintenance: [
    {
      guideId: 'hygiene',
      title: 'Hygienewäsche 75 °C',
      sub: 'Gegen Keime, wenn du oft kalt wäschst',
    },
    { guideId: 'zulauf', title: 'Zulaufsiebe prüfen', sub: 'Etwa alle sechs Monate' },
  ],

  common: {
    example: (value: string) => `z. B. ${value}`,
    /** Mittelpunkt als Trenner wie im Designsystem */
    dot: (...parts: string[]) => parts.filter(Boolean).join(' · '),
    sentences: (...parts: string[]) => parts.filter(Boolean).join(' '),
    /** „A, B und C“ */
    list: (items: readonly string[]) =>
      items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`,
    exampleValues: 'Beispielwerte',
    later: 'Später',
    cancel: 'Abbrechen',
    change: 'Ändern',
    loading: 'Wird geladen',
    free: 'kostenfrei',
    phoneHint: 'Öffnet die Telefon-App.',
    /** Die Telefon-App lässt sich nicht öffnen, etwa auf einem Tablet */
    phoneFailed: (phone: string) =>
      `Die Telefon-App öffnet sich hier nicht. Die Nummer ist ${phone}.`,
    /** Die Mail-App lässt sich nicht öffnen, etwa im Web ohne Mail-Programm */
    mailFailed: (email: string) => `Die Mail-App öffnet sich hier nicht. Die Adresse ist ${email}.`,
  },

  /**
   * Ruhige Hinweise, wenn mach’s einen Befehl ablehnt (hooks/useCommand.ts, Schritt 24). Nie der
   * Fehlertext der Domäne.
   */
  command: {
    refused: {
      unbekannt: 'Das gibt es hier nicht mehr. Deine Fälle findest du unter „Fälle“.',
      bestaetigung: 'Dafür fehlt noch deine Bestätigung.',
      vertrag: 'Dafür brauchst du einen verknüpften Schutz.',
      nurBetrieb: 'Dieses Teil baut immer der Betrieb ein.',
      /** Der Betrag vor „Zahlungspflichtig buchen“ gilt nicht mehr (Nr. 31) */
      betrag: 'Der Betrag hat sich geändert. Sieh ihn dir noch einmal an.',
      other: 'Das geht gerade nicht mehr. Im Gespräch siehst du, wie es weitergeht.',
    },
    failed: 'Das hat nicht geklappt. Versuch es gleich noch einmal.',
  },

  /** Hinweis, wenn sich der gespeicherte Stand beim Start nicht laden lässt (Schritt 19) */
  recovery: {
    title: 'Deine Daten lassen sich gerade nicht laden.',
    text: 'Die App kann den gespeicherten Stand auf diesem Telefon nicht lesen. Versuch es noch einmal.',
    resetText:
      'Hilft das nicht, setz die App zurück. Dann beginnst du neu, ohne deine Geräte und Fälle. Eine Kopie der alten Daten bleibt auf dem Telefon.',
    retry: 'Erneut versuchen',
    retryHint: 'Lädt den gespeicherten Stand noch einmal.',
    reset: 'Zurücksetzen',
    resetHint: 'Beginnt neu ohne Geräte und Fälle. Eine Kopie der alten Daten bleibt.',
    retryFailed: 'Das hat wieder nicht geklappt. Du kannst die App zurücksetzen.',
    resetFailed: 'Das Zurücksetzen hat nicht geklappt. Versuch es gleich noch einmal.',
  },

  onboarding: {
    welcomePhoto: 'Waschmaschine in einer Küche',
    welcomeTitle: 'Reparatur, die mit einem Foto beginnt.',
    privacyTitle: 'Was mit deinen Daten passiert',
    privacyText:
      'mach’s speichert Fotos, Gerätedaten und den Verlauf deiner Fälle auf diesem Gerät. Weitergegeben wird nur, was du vorher bestätigst: an die Fachkraft, den Betrieb oder deinen Versicherer. Jede Einwilligung kannst du im Profil widerrufen.',
    privacyBasis:
      'Grundlage ist dein Nutzungsvertrag mit mach’s (Art. 6 Abs. 1 lit. b DSGVO). Einwilligungen für Zusätzliches fragen wir einzeln.',
    start: 'Los geht’s',
    testPhase: 'Noch in der Testphase.',
    linkTitle: 'Verknüpf deinen Schutz.',
    linkText:
      'Hast du einen Geräteschutz, zum Beispiel eine Garantieverlängerung? Dann zeigt mach’s dir, was abgedeckt ist.',
    viaLabel: 'Womit verknüpfst du?',
    via: { vertragsnummer: 'Vertragsnummer', haendler_code: 'Händler-Code' },
    hint: {
      vertragsnummer: 'Steht auf deinem Vertrag oder in der E-Mail zum Abschluss.',
      haendler_code: 'Steht auf deinem Kaufbeleg.',
    },
    unknown: {
      vertragsnummer: 'Diese Nummer kennen wir nicht. Prüf sie bitte noch einmal.',
      haendler_code: 'Diesen Code kennen wir nicht. Prüf ihn bitte noch einmal.',
    },
    empty: 'Gib zuerst eine Nummer ein.',
    checking: 'Wird geprüft',
    link: 'Schutz verknüpfen',
    linked: (product: string, insurer: string) => `${product} bei ${insurer} verknüpft.`,
    confirmTitle: 'Ist das dein Gerät?',
    confirmText: (insurer: string) => `Dieses Gerät steht in deinem Vertrag bei ${insurer}.`,
    confirmYes: 'Ja, das ist es',
    otherDevice: 'Anderes Gerät',
    otherDeviceSub: 'Typenschild fotografieren',
    firstDeviceTitle: 'Füg dein erstes Gerät hinzu.',
    addDevice: 'Gerät hinzufügen',
    skipDevice: 'Später hinzufügen',
  },

  /** Gerät anlegen: Gerät wählen, dann Versicherung oder Händler (Entscheidung 16) */
  setup: {
    pickTitle: 'Wähl dein Gerät.',
    searchLabel: 'Gerät suchen',
    searchPlaceholder: 'Hersteller oder Modell, z. B. G 5833',
    catalogSub: (category: string) => `${category} · Anleitungen aus der Gebrauchsanweisung`,
    noMatch: 'Kein Gerät gefunden.',
    scan: 'Typenschild fotografieren',
    manual: 'Anderes Gerät eintragen',
    coverageTitle: 'Zusätzlich eine Versicherung?',
    insured: 'Ja, Versicherung vorhanden',
    notInsured: 'Nein, keine Versicherung',
    insurerTitle: 'Wähl deinen Versicherer.',
    insurerSearch: 'Versicherer suchen',
    insurerPlaceholder: (example: string) => `Name, z. B. ${example}`,
    policyLabel: 'Police-Nr.',
    policyEmpty: 'Gib zuerst die Police-Nr. ein.',
    pickInsurerFirst: 'Wähl zuerst deinen Versicherer.',
    savePolicy: 'Versicherung speichern',
    dealerTitle: 'Wo hast du es gekauft?',
    dealerSearch: 'Händler suchen',
    dealerPlaceholder: (example: string) => `Name oder Ort, z. B. ${example}`,
    dealerService: (place: string, service: string) => `${place} · Kundendienst: ${service}`,
    dealerUnknown: 'Weiß ich nicht mehr',
    pickDealerFirst: 'Wähl zuerst einen Händler oder „Weiß ich nicht mehr“.',
    saveDealer: 'Weiter',
    nothingFound: 'Nichts gefunden. Prüf die Schreibweise.',
  },

  coverage: {
    productDefault: 'Geräteversicherung',
    dealer: 'Gekauft bei',
    dealerUnknown: 'Händler unbekannt',
    insurer: 'Versichert bei',
    policy: 'Police-Nr.',
    change: 'Versicherung oder Händler ändern',
  },

  home: {
    searchTitle: 'Was ist kaputt?',
    searchSub: 'Foto, Meldung oder Symptom',
    myDevices: 'Deine Geräte',
    protectionActive: 'Geräteschutz aktiv',
    addDevice: 'Gerät hinzufügen',
    emptyTitle: 'Noch kein Gerät',
    openCase: 'Offener Fall',
    caseNumber: (id: string) => `Fall ${id}`,
    openCaseLabel: (id: string) => `Offener Fall · Fall ${id}`,
    continueCase: 'Weitermachen',
    addMenu: 'Hinzufügen',
  },

  deviceStatus: {
    laeuft: 'läuft',
    problem: 'Problem gemeldet',
    hilfe: 'Hilfe angefragt',
    reparatur: (slot: string) => `Reparatur ${slot}`,
    /** Gewährleistung: Der Betrieb bessert nach (Nr. 32) */
    nachbesserung: 'Nachbesserung',
    nachbesserungTermin: (slot: string) => `Nachbesserung ${slot}`,
  },

  device: {
    meta: (category: string, since: string) => `${category} · seit ${since}`,
    photo: (name: string) => name,
    reportProblem: 'Problem melden',
    sections: {
      status: 'Status',
      protection: 'Schutz',
      maintenance: 'Pflege laut Hersteller',
      guides: 'Anleitungen',
      cases: 'Fälle',
      service: 'Kundendienst',
      device: 'Gerät',
    },
    protectionFacts: {
      product: 'Schutz',
      provider: 'Über',
      validUntil: 'Gültig bis',
      deductible: 'Selbstbeteiligung',
      number: 'Vertrag',
    },
    noProtection: 'Kein Schutz verknüpft',
    count: (n: number) => (n === 1 ? '1 Anleitung' : `${n} Anleitungen`),
    casesCount: (n: number) => (n === 1 ? '1 Fall' : `${n} Fälle`),
    casesCountShared: (n: number) =>
      n === 0 ? 'Nichts weitergegeben' : n === 1 ? '1 Weitergabe' : `${n} Weitergaben`,
    noProtectionText: 'Reparaturen zahlst du selbst.',
    deviceFacts: {
      manufacturer: 'Hersteller',
      model: 'Modell',
      category: 'Gerät',
      materialNumber: 'M.-Nr.',
      serialNumber: 'Fabrik-Nr.',
      purchased: 'Gekauft',
    },
    guideSource: (source: string) => `Aus der ${source}`,
    noGuides: 'Noch keine Anleitungen.',
    noCases: 'Noch keine Fälle zu diesem Gerät.',
    serviceSub: (phone: string, free: boolean) => (free ? `${phone} · kostenfrei` : phone),
    notFound: 'Dieses Gerät gibt es nicht mehr.',
  },

  scan: {
    title: 'Fotografier das Typenschild.',
    where:
      'Meist innen an der Tür oder am Türrahmen, bei Waschmaschinen oberhalb des Schauglases. Beim Kühlschrank innen an der Seitenwand.',
    takePhoto: 'Typenschild fotografieren',
    manual: 'Manuell eingeben',
    reading: 'Typenschild wird gelesen',
    recognized: 'Erkannt',
    accept: 'Gerät übernehmen',
    edit: 'Angaben ändern',
    notRecognizedTitle: 'Wir konnten das Typenschild nicht lesen.',
    notRecognizedText: 'Mehr Licht, Schild ganz in den Rahmen.',
    retry: 'Noch einmal fotografieren',
    formTitle: 'Gerät eingeben',
    manufacturer: 'Hersteller',
    category: 'Art des Geräts',
    model: 'Modell',
    materialNumber: 'M.-Nr. (optional)',
    serialNumber: 'Fabrik-Nr. (optional)',
    modelRequired: 'Gib das Modell ein.',
    save: 'Gerät speichern',
  },

  camera: {
    permissionTitle: 'mach’s braucht deine Kamera.',
    permissionText:
      'Für Fotos von Display, Typenschild oder Bauteil. Die Fotos bleiben in deinem Fall.',
    allow: 'Kamera erlauben',
    deniedTitle: 'Die Kamera ist nicht erlaubt.',
    deniedText:
      'Erlaube den Zugriff in den Einstellungen deines Telefons. Danach geht es hier weiter.',
    openSettings: 'Einstellungen öffnen',
    unavailableTitle: 'Hier gibt es keine Kamera.',
    unavailableText: 'Wir nehmen stattdessen ein Beispielfoto.',
    useDemoPhoto: 'Beispielfoto nehmen',
    shutter: 'Foto aufnehmen',
    modesLabel: 'Was fotografierst du?',
    modes: { display: 'Display', typenschild: 'Typenschild', bauteil: 'Bauteil' },
    help: {
      display: 'Display in den Rahmen.',
      typenschild: 'Typenschild ganz in den Rahmen.',
      bauteil: 'Bauteil oder Schaden zeigen.',
    },
    preview: 'Kamerabild',
    failed: 'Das Foto hat nicht geklappt. Versuch es noch einmal.',
  },

  problem: {
    title: 'Was ist los?',
    photo: 'Foto machen',
    photoSub: 'Display, Typenschild oder Bauteil',
    describe: 'Oder beschreib es so, wie du es am Telefon erzählen würdest:',
    other: 'Etwas anderes',
    otherSub: 'Beschreib es in eigenen Worten',
    otherTitle: 'Was ist passiert?',
    otherLabel: 'Deine Beschreibung',
    otherHint: 'Die Fachkraft liest das vor dem Videocall.',
    otherTooShort: 'Schreib bitte ein paar Worte dazu.',
    getHelp: 'Hilfe holen',
    photoLabel: 'Foto',
    noDevice: 'Füg zuerst ein Gerät hinzu.',
    forDevice: (name: string) => `Für ${name}`,
  },

  messages: {
    title: 'Was steht im Display?',
    displayIcon: 'Display',
  },

  analysis: {
    title: 'Intelligente Fehlererkennung',
    lines: {
      display: [
        'Gerät erkennen',
        'Meldung im Display lesen',
        'Bauteile prüfen',
        'Mit der Herstelleranleitung abgleichen',
      ],
      typenschild: [
        'Typenschild finden',
        'Modell und Baujahr lesen',
        'Mit den Gerätedaten abgleichen',
      ],
      bauteil: [
        'Gerät erkennen',
        'Bauteil erkennen',
        'Sichtbare Schäden prüfen',
        'Mit der Herstelleranleitung abgleichen',
      ],
    },
    lineDone: (line: string) => `${line}: erledigt`,
    blurryTitle: 'Das Foto ist unscharf.',
    blurryText: 'Ruhig halten, mehr Licht.',
    newPhoto: 'Neues Foto',
    photo: 'Dein Foto',
  },

  question: {
    title: 'Eine Frage noch',
    wasser: 'Was passiert, wenn das Programm abbricht?',
    answers: {
      ablauf: 'Wasser bleibt in der Trommel',
      zulauf: 'Es kommt kein Wasser in die Maschine',
      unklar: 'Weiß ich nicht',
    },
    next: 'Weiter',
  },

  result: {
    from: {
      display: 'Aus deinem Foto vom Display und den Gerätedaten',
      bauteil: 'Aus deinem Foto vom Bauteil und den Gerätedaten',
      typenschild: 'Aus deinem Foto vom Typenschild',
      meldung: 'Aus der Meldung im Display',
      symptom: 'Aus deiner Beschreibung',
    },
    headline: {
      wasserablauf: 'Wahrscheinlich ist der Laugenfilter verstopft.',
      laugenpumpe_blockiert: 'Wahrscheinlich blockiert etwas die Laugenpumpe.',
      wasserzulauf: 'Wahrscheinlich kommt zu wenig Wasser an.',
    },
    component: {
      wasserablauf: 'Laugenfilter / Laugenpumpe',
      laugenpumpe_blockiert: 'Laugenpumpe',
      wasserzulauf: 'Zulaufschlauch und Siebe',
    },
    noDamage: 'keine',
    facts: {
      device: 'Gerät',
      message: 'Meldung',
      component: 'Betroffenes Bauteil',
      damage: 'Sichtbare Schäden',
      confidence: 'Sicherheit',
    },
    quoted: (text: string) => `„${text}“`,
    beforeTitle: 'Bevor du anfängst',
    tools: (list: string) => `Du brauchst: ${list}.`,
    noTools: 'Du brauchst kein Werkzeug.',
    stepsCount: (n: number) => (n === 1 ? '1 Schritt' : `${n} Schritte`),
    source: (manufacturer: string) => `aus der Anleitung von ${manufacturer}`,
    costNote: (insurer: string, deductible: string) =>
      `Brauchst du Hilfe, prüft ${insurer} die Kosten. Deine Selbstbeteiligung laut Vertrag: ${deductible}.`,
    costNoteNoContract: 'Brauchst du Hilfe, siehst du den Preis vorher.',
    startGuide: 'Anleitung starten',
    doesNotFit: 'Passt nicht',
    helpInstead: 'Lieber gleich Hilfe holen',
    deviceTitle: 'Gerät erkannt',
    deviceText: 'Jetzt ein Foto vom Display oder vom Bauteil.',
    photoDisplay: 'Display fotografieren',
    describe: 'Problem beschreiben',
    missing: 'Noch kein Ergebnis.',
    noGuideTitle: 'Dafür gibt es noch keine Anleitung zum Selbermachen.',
    getHelp: 'Hilfe holen',
  },

  guide: {
    source: (manufacturer: string) => `aus der Anleitung von ${manufacturer}`,
    noSelf: 'Nicht selbst lösbar',
    noSelfSub: (manufacturer: string) => `laut Anleitung von ${manufacturer}`,
    youNeed: 'Du brauchst',
    /** Einmal im ersten Schritt (Entscheidung 20). Seite und Originaltext stehen in der Fallakte. */
    sourceShort: (document: string) => `Aus der ${document}`,
    beforeTitle: 'Bevor du anfängst',
    done: 'Erledigt',
    notWorking: 'Geht nicht',
    runsAgain: 'Läuft wieder',
    stillBroken: 'Läuft noch nicht',
    finished: 'Fertig',
    stepBack: 'Schritt zurück',
    getHelp: 'Hilfe holen',
    images: { fehler: 'Display mit Meldung', pumpe: 'Laugenfilter hinter der Klappe' },
    confirm: { waterproof: 'Der Wasserhahn ist zu' },
    confirmFirst: (what: string) => `Bitte bestätige zuerst: ${what}.`,
    notWorkingTitle: 'Was klappt nicht?',
    noteLabel: 'Notiz für die Fachkraft (optional)',
    notePlaceholder: 'z. B. Der Filter lässt sich nicht drehen.',
    missing: 'Diese Anleitung gibt es nicht mehr.',
    sourceDocument: (doc: string) => `Quelle: ${doc}`,
    sourcePage: (doc: string, page: number) => `Quelle: ${doc}, Seite ${page}`,
  },

  help: {
    photo: 'Fachkraft im Videocall',
    title: 'Kein Problem. Wir holen Hilfe.',
    text: 'Am schnellsten geht es im Videocall. Die Fachkraft sieht deine Fallakte und muss nichts doppelt fragen.',
    costNote: (insurer: string, deductible: string) =>
      `Die Kosten prüft ${insurer} nach dem Befund. Selbstbeteiligung laut Vertrag: ${deductible}.`,
    costNoteNoContract: 'Ohne Schutz zahlst du selbst. Den Preis siehst du vor jeder Buchung.',
    fileTitle: 'Deine Fallakte',
    facts: {
      device: 'Gerät',
      problem: 'Problem',
      result: 'Ergebnis',
      steps: 'Anleitung',
      note: 'Notiz',
    },
    stepsDone: (done: number, total: number) => `${done} von ${total} Schritten erledigt`,
    abortedAt: (step: number, title: string) => `Ging nicht bei Schritt ${step}: ${title}`,
    notStarted: 'Anleitung nicht gestartet',
    noRecording: 'Keine Aufnahme. Ton und Bild werden nicht gespeichert.',
    screenshots: 'Screenshots als Nachweis erlauben',
    others: 'Andere Wege',
    onSite: 'Vor-Ort-Diagnose',
    onSiteSub: 'Ein Fachbetrieb kommt und schaut es sich an',
    callMeta: 'Videocall',
    callSub: 'Wartezeit ca. 1 Minute',
    startCall: 'Videocall starten',
    item: (text: string) => `· ${text}`,
  },

  waiting: {
    title: (expert: string) => `Wir verbinden dich mit ${expert}${expert.endsWith('.') ? '' : '.'}`,
    text: 'Bleib in der Nähe des Geräts.',
    estimate: 'Geschätzte Wartezeit: 1 Minute',
    skip: 'Wartezeit überspringen (Demo)',
    noExpertTitle: 'Gerade ist keine Fachkraft frei.',
    noExpertText: 'Wir rufen dich zurück. Wähl, wann es dir passt. Oder ein Betrieb kommt vorbei.',
    callbackSlots: ['In 30 Minuten', 'Heute Abend', 'Morgen vormittags'],
    callbackLabel: 'Wann passt der Rückruf?',
    requestCallback: 'Rückruf anfragen',
    onSiteInstead: 'Lieber Vor-Ort-Diagnose',
    /** Bestätigung vor dem Rückruf (R-16) */
    confirmTitle: (slot: string) => `Rückruf: ${slot}`,
    confirmText: 'Vor dem Rückruf bekommt die Fachkraft deine Fallakte.',
  },

  call: {
    expertLine: (expert: string) => `${expert} · Fachkraft`,
    companyLine: (company: string, time: string) => `${company} · ${time}`,
    noRecording: 'Keine Aufnahme',
    sees: (problem: string, steps: string) => `Sieht deine Fallakte: ${problem} · ${steps}`,
    stepsShort: (n: number) => (n === 1 ? '1 Schritt erledigt' : `${n} Schritte erledigt`),
    mic: 'Mikrofon',
    micOn: 'an',
    micOff: 'aus',
    camera: 'Kamera',
    hangUp: 'Auflegen',
    expertVideo: (expert: string) => `Videobild von ${expert}`,
    selfVideo: 'Dein Kamerabild',
  },

  finding: {
    from: (expert: string) => `Befund von ${expert}`,
    question: 'Wie geht es weiter?',
    options: {
      geloest: 'Im Call gelöst',
      reparatur: 'Reparatur durch einen Fachbetrieb',
      ersatzgeraet: 'Ersatzgerät nötig',
    },
    optionSubs: {
      ersatzgeraet: 'Eine Reparatur lohnt sich nicht',
    },
    recommended: (label: string) => `Empfehlung der Fachkraft: ${label}`,
    next: 'Weiter',
    replacementNote: 'vergleichbares Modell',
  },

  caseFile: {
    resultLine: (component: string, confidence: string) =>
      `${component} · Sicherheit: ${confidence}`,
    messageLine: (message: string) => `Meldung „${message}“`,
    noGuide: 'Foto erfasst, keine Anleitung für dieses Gerät',
    photos: 'Fotos',
    photoLine: (purpose: string, time: string) => `${purpose} · ${time}`,
    photoPurpose: {
      display: 'Display',
      typenschild: 'Typenschild',
      bauteil: 'Bauteil',
      schritt: 'Schritt',
      frage: 'Frage an den Assistenten',
      kaufbeleg: 'Kaufbeleg',
      abschluss: 'Abschluss',
    },
    finding: 'Befund',
    findingLine: (what: string, by: string) => `${what} · ${by}`,
    by: { fachkraft: 'Fachkraft im Videocall', betrieb: 'Fachbetrieb vor Ort' },
    costs: 'Kosten',
    costsLine: (repair: string, replacement: string) =>
      `Reparatur ${repair} · Ersatzgerät ${replacement}`,
    noPhotos: 'Keine Fotos',
  },

  costs: {
    findingMeta: (finding: string) => `Befund: ${finding}`,
    title: 'Reparieren lohnt sich.',
    titleReplacement: 'Ein Ersatzgerät ist nötig.',
    repair: 'Reparatur',
    repairSub: 'Teil und Arbeit',
    replacement: 'Ersatzgerät',
    replacementSub: 'vergleichbares Modell',
    saving: (amount: string) => `Ersparnis in diesem Fall: ${amount}`,
    compareNew: (replacement: string, saving: string) =>
      `Ein neues Gerät würde ${replacement} kosten. Ersparnis in diesem Fall: ${saving}.`,
    payer: 'Das zahlt',
    payerValue: (insurer: string) => `${insurer}, vorbehaltlich Freigabe`,
    payerApproved: (insurer: string) => `${insurer}, freigegeben`,
    payerSelf: 'Du selbst',
    deductible: 'Deine Selbstbeteiligung',
    ifRejected: (insurer: string) => `Wenn ${insurer} ablehnt`,
    ifRejectedValue:
      'Dann entscheidest du: Reparatur selbst zahlen, Kostenvoranschlag behalten oder Fall schließen.',
    preview: (insurer: string) => `Das geht an ${insurer}`,
    previewContract: (number: string) => `Vertrag ${number}`,
    legal: (insurer: string) =>
      `Mit dem Tap meldest du den Schadenfall an ${insurer}. Grundlage ist dein Versicherungsvertrag (Art. 6 Abs. 1 lit. b DSGVO).`,
    report: 'Schadenfall melden',
    barMeta: (deductible: string) => `Selbstbeteiligung ${deductible}`,
    barSub: 'vorbehaltlich Freigabe',
    selfPay: 'Ohne Versicherung selbst zahlen',
    noContractText: 'Für dieses Gerät ist kein Schutz verknüpft. Du zahlst die Reparatur selbst.',
    toAppointment: 'Weiter zum Termin',
    rejectedTitle: (insurer: string) => `${insurer} übernimmt die Kosten nicht.`,
    rejectedSelfPay: (amount: string) => `Reparatur selbst zahlen (${amount})`,
    keepQuote: 'Kostenvoranschlag behalten',
    closeCase: 'Fall schließen',
    closeReason: 'Abgelehnt, nicht repariert',
    replacementNext: (insurer: string) =>
      `${insurer} meldet sich zum Ersatzgerät, sobald die Prüfung fertig ist.`,
  },

  appointment: {
    titleRepair: 'Wer soll kommen?',
    titleDiagnosis: 'Wer schaut es sich an?',
    when: 'Wann passt es dir?',
    address: 'Adresse',
    summary: 'Zusammenfassung',
    facts: {
      partner: 'Betrieb',
      slot: 'Zeitfenster',
      address: 'Adresse',
      job: 'Auftrag',
      costs: 'Kosten',
      /** Im verbindlichen Schritt: was du mit dem Tap zahlst (Nr. 31) */
      due: 'Du zahlst',
    },
    jobRepair: (part: string) => `${part} tauschen, Original-Teil`,
    jobDiagnosis: 'Vor-Ort-Diagnose mit Kostenvoranschlag',
    /**
     * Während der Prüfung: Die Selbstbeteiligung fällt nur an, wenn der Versicherer freigibt.
     * Kein Betrag, den du jetzt schon schuldest (CLAUDE.md, keine Kostenzusage vor der Freigabe).
     */
    costsClaim: (insurer: string, deductible: string) =>
      `${insurer}, vorbehaltlich Freigabe · Selbstbeteiligung ${deductible}, falls ${insurer} freigibt`,
    /** Nach der Freigabe: Der Versicherer zahlt, du die Selbstbeteiligung */
    costsApproved: (insurer: string, deductible: string) =>
      `${insurer} hat freigegeben · Selbstbeteiligung ${deductible}`,
    costsSelf: (amount: string) => `Du zahlst ${amount}`,
    /**
     * Vor-Ort-Diagnose: Den Besuch zahlt der Haushalt. Einen Preis gibt es noch nicht, also nennt
     * der Betrieb ihn vorher. Kein Betrag, keine Zusage (payer.ts).
     */
    costsDiagnosis:
      'Den Besuch zahlst du selbst. Die Anfrage ist unverbindlich. Der Betrieb nennt dir vor dem Termin den Preis, dann entscheidest du. Den Kostenvoranschlag für die Reparatur siehst du danach.',
    pending: 'Der Termin ist vorbehaltlich Freigabe. Gibt es keine Freigabe, entscheidest du neu.',
    /**
     * Während der Prüfung mit Selbstbeteiligung über 0 €: Die Anfrage bindet dich noch nicht. Der
     * verbindliche Schritt kommt nach der Freigabe (Entscheidung Nr. 31).
     */
    pendingBinding: (insurer: string) =>
      `Die Anfrage ist unverbindlich. Gibt ${insurer} frei, buchst du danach verbindlich.`,
    /** Nach der Freigabe: Zusammenfassung vor „Zahlungspflichtig buchen“ (Nr. 31) */
    bindingTitle: 'Jetzt buchst du verbindlich.',
    bindingAsk: 'Prüf die Zusammenfassung. Erst dein Tap macht die Buchung verbindlich.',
    dueDeductible: (amount: string) => `Selbstbeteiligung ${amount}`,
    /** Vor-Ort-Diagnose: der Preis, den der Betrieb genannt hat (Nr. 33) */
    duePrice: (amount: string) => `${amount} für den Besuch`,
    priceNamed: (partner: string, amount: string) =>
      `${partner} nennt den Preis für den Besuch: ${amount}.`,
    /** Du buchst nicht: Die unverbindliche Anfrage endet (Nr. 33) */
    decline: 'Nicht buchen',
    declineSub: 'Die Anfrage endet. Du zahlst nichts.',
    declined: 'Die Anfrage ist beendet. Du zahlst nichts.',
    /**
     * Steht bei jedem „Zahlungspflichtig buchen“, direkt beim Termin und im Schritt nach der
     * Freigabe. Gestempelt mit dem Tap (lib/legalTexts.ts, verbindliche_buchung).
     */
    bindingNotice: (partner: string) =>
      `Mit „Zahlungspflichtig buchen“ buchst du verbindlich. Erst dann bestätigt ${partner} den Termin.`,
    /** Nach dem Tap im eigenen Schritt */
    booked: 'Verbindlich gebucht.',
    ecoDesign: (part: string, days: number) =>
      `Der Betrieb bekommt ${part} innerhalb von ${days} Arbeitstagen. So verlangt es das EU-Ökodesign-Recht.`,
    /** data: die Kategorien aus consentScopes (weitergabe_betrieb), mit de.common.list */
    shares: (data: string) => `Der Betrieb bekommt ${data}.`,
    /**
     * Steht vor „Termin anfragen“, solange Mitteilungen noch nicht entschieden sind. Danach fragt
     * das System. Gespeichert wird dieser Text mit der Einwilligung (lib/legalTexts.ts).
     */
    notificationsNotice:
      'Danach fragt dein Telefon, ob mach’s dir Mitteilungen zum Fall-Status schicken darf. Sie sagen nur, dass es Neuigkeiten gibt.',
    addressLine: (street: string, zip: string, city: string) => `${street}, ${zip} ${city}`,
    request: 'Termin anfragen',
    requestPaid: 'Zahlungspflichtig buchen',
    pickSlot: 'Wähl bitte ein Zeitfenster.',
    noPartner:
      'Gerade hat kein Betrieb in deiner Nähe Zeit. Wir melden uns, sobald einer frei ist.',
    /** Für diesen Fall gibt es gerade keinen Termin, z. B. weil schon einer läuft */
    unavailableTitle: 'Hier gibt es gerade keinen Termin.',
  },

  status: {
    caseNumber: (id: string) => `Fall ${id}`,
    headline: {
      pruefung: (insurer: string) => `${insurer} prüft die Kosten.`,
      freigegeben: (insurer: string) => `${insurer} hat die Kosten freigegeben.`,
      abgelehnt: (insurer: string) => `${insurer} übernimmt die Kosten nicht.`,
      angefragt: 'Termin angefragt.',
      /** Der Betrieb hat den Preis für die Vor-Ort-Diagnose genannt (Nr. 33) */
      preis: (partner: string, amount: string) => `${partner} nennt den Preis: ${amount}.`,
      /** Gewährleistung, noch ohne Termin (Nr. 32) */
      nachbesserung: (partner: string) => `${partner} bessert nach.`,
      bestaetigt: (slot: string) => `Termin steht: ${slot}.`,
      unterwegs: (partner: string) => `${partner} ist unterwegs.`,
      repariert: 'Repariert.',
      diagnoseFertig: 'Der Betrieb hat einen Kostenvoranschlag gemacht.',
      rueckruf: (slot: string) => `Rückruf angefragt: ${slot}.`,
      ersatzgeraet: (insurer: string) => `${insurer} meldet sich zum Ersatzgerät.`,
      erledigt: 'Erledigt.',
      abgebrochen: 'Abgebrochen.',
      hilfe: 'Hilfe angefragt.',
    },
    text: {
      pruefung: 'Du bekommst eine Mitteilung, sobald die Entscheidung da ist.',
      /** Ohne Einwilligung in Mitteilungen kommt keine (R-13) */
      pruefungImFall: 'Die Entscheidung siehst du hier im Fall.',
      angefragt: (partner: string) =>
        `${partner} bestätigt den Termin. Danach bekommst du eine Mitteilung.`,
      angefragtImFall: (partner: string) =>
        `${partner} bestätigt den Termin. Das siehst du dann hier im Fall.`,
      /** Vor-Ort-Diagnose angefragt: Erst kommt der Preis (Nr. 33) */
      angefragtDiagnose: (partner: string) =>
        `${partner} nennt dir vor dem Termin den Preis. Dann entscheidest du, ob du buchst.`,
      bestaetigt: (partner: string, part: string) => `${partner} bringt ${part} mit.`,
      diagnoseFertig: 'Sieh dir die Kosten an und entscheide, wie es weitergeht.',
      rueckruf: 'Die Fachkraft ruft dich an. Deine Fallakte hat sie schon.',
      /** Gewährleistung, noch ohne Termin (Nr. 32) */
      nachbesserung: 'Wähl im Gespräch einen Termin. Für die Nachbesserung zahlst du nichts Neues.',
      /** Der Termin wartet auf „Zahlungspflichtig buchen“ (Nr. 31) */
      buchen: (partner: string) =>
        `Buch den Termin im Gespräch verbindlich. Erst dann bestätigt ${partner} ihn.`,
      /** Die Weitergabe für den nächsten Schritt ist widerrufen (R-12) */
      paused: 'Du hast die Weitergabe widerrufen. Darum geht es hier gerade nicht weiter.',
    },
    timeline: {
      gemeldet: 'Problem gemeldet',
      schaden: 'Schadenfall gemeldet',
      freigabe: (insurer: string) => `Freigabe durch ${insurer}`,
      freigegeben: (insurer: string) => `${insurer} hat freigegeben`,
      abgelehnt: (insurer: string) => `${insurer} hat abgelehnt`,
      angefragt: 'Termin angefragt',
      preis: 'Preis genannt',
      nachbesserung: 'Nachbesserung verlangt, Gewährleistung',
      buchen: 'Verbindlich buchen',
      gebucht: 'Verbindlich gebucht',
      bestaetigt: 'Termin bestätigt',
      unterwegs: 'Betrieb unterwegs',
      repariert: 'Repariert',
      diagnose: 'Kostenvoranschlag vom Betrieb',
      rueckruf: 'Rückruf angefragt',
      next: 'als Nächstes',
    },
    booking: 'Termin',
    toFinish: 'Zum Abschluss',
    whatNext: 'Wie geht es weiter?',
    seeCosts: 'Kosten ansehen',
    caseFile: 'Fallakte ansehen',
    toDevices: 'Zu meinen Geräten',
    demoNext: 'Nächster Schritt (Demo)',
  },

  /**
   * Mitteilungen stehen auf dem Sperrbildschirm, für alle sichtbar. Darum ein neutraler Satz für
   * jeden Schritt: kein Gerät, kein Betrag, kein Betrieb, keine Entscheidung, kein Zeitfenster und
   * keine Fallnummer (R-17). Was passiert ist, zeigt die App.
   */
  notify: {
    update: { title: 'Neuigkeiten', body: 'Es gibt Neuigkeiten zu deinem Fall.' },
  },

  finish: {
    photo: 'Abschlussfoto vom Betrieb',
    solvedTitle: 'Wieder ganz.',
    solvedText: 'Du hast es selbst repariert.',
    solvedCallText: 'Im Videocall gelöst.',
    repairedTitle: 'Repariert.',
    runsAgain: 'Läuft wieder',
    stillBroken: 'Problem besteht weiter',
    rate: 'Wie zufrieden bist du mit dem Betrieb?',
    thanks: 'Danke für deine Bewertung.',
    done: 'Fertig',
  },

  cases: {
    open: 'Offen',
    closed: 'Abgeschlossen',
    emptyTitle: 'Noch keine Fälle',
    report: 'Problem melden',
    rowSub: (device: string, status: string, date: string) => `${device} · ${status} · ${date}`,
  },

  file: {
    title: (id: string) => `Fall ${id}`,
    status: (label: string) => `Status: ${label}`,
    history: 'Verlauf',
    shared: 'Weitergegeben an',
    sharedLine: (recipient: string, date: string) => `${recipient} · ${date}`,
    /** Weitergabe an den Reparatur-Assistenten aus diesem Fall (R-15) */
    assistantLine: (recipient: string, messages: string, time: string) =>
      `${recipient}, Reparatur-Assistent · ${messages} · zuletzt ${time}`,
    revoked: (date: string) => `widerrufen am ${date}`,
    none: 'Noch nichts weitergegeben.',
    overview: 'Überblick',
    eventsCount: (n: number) => (n === 1 ? '1 Eintrag' : `${n} Einträge`),
    event: {
      step: (n: number, title: string) => `Schritt ${n}: ${title}`,
      stepPage: (n: number, title: string, page: number) =>
        `Schritt ${n}: ${title} · Gebrauchsanweisung Seite ${page}`,
      guide: (title: string) => `Anleitung: ${title}`,
      outcome: {
        laeuft_wieder: 'Läuft wieder',
        laeuft_nicht: 'Läuft noch nicht',
        geht_nicht: 'Geht nicht',
        fertig: 'Fertig',
      },
      /** Anleitung endet, weil es mit einem anderen Problem weitergeht (R-06) */
      replaced: 'Anderes Problem gewählt',
      photo: (purpose: string) => `Foto: ${purpose}`,
      status: (label: string) => `Status: ${label}`,
      shared: (recipient: string) => `an ${recipient}`,
      decision: { freigegeben: 'freigegeben', abgelehnt: 'abgelehnt', rueckfrage: 'Rückfrage' },
      by: { mensch: 'von einem Menschen', regel: 'automatisch' },
      callback: (slot: string) => `Rückruf: ${slot}`,
      booking: (partner: string, slot: string) => `${partner} · ${slot}`,
      /** Zahlungspflichtig gebucht: Betrieb, Zeitfenster und Betrag (Nr. 31) */
      binding: (partner: string, slot: string, amount: string) =>
        `${partner} · ${slot} · ${amount}`,
      /** Preis für die Vor-Ort-Diagnose (Nr. 33) */
      price: (partner: string, amount: string) => `${partner} · ${amount}`,
      /** Nachbesserung (Nr. 32): Betrieb und Ende der Gewährleistung, Annahme bis zur Antwort des Anwalts */
      rework: (partner: string, until: string) => `${partner} · Gewährleistung bis ${until}`,
      /** Termin und Abschluss einer Nachbesserung */
      reworkBooking: (partner: string, slot: string) =>
        `Nachbesserung, Gewährleistung · ${partner} · ${slot}`,
      reworkDone: 'Nachbesserung, Gewährleistung',
      /** Warum nach „Problem besteht weiter“ keine Nachbesserung kam */
      noRework: {
        abgelaufen: 'Gewährleistung abgelaufen',
        nachbesserung_gescheitert: 'Nachbesserung hat nicht geholfen',
      },
      stars: (n: number) => `${n} von 5 Sternen`,
      answer: (q: string, a: string) => `${q} ${a}`,
      note: (note: string) => `Notiz: ${note}`,
      reason: (reason: string) => `Grund: ${reason}`,
      detail: (title: string, detail: string) => `${title} · ${detail}`,
    },
  },

  /**
   * Nachbesserung in der gesetzlichen Gewährleistung (Entscheidung Nr. 32). Die Sätze sagen nicht
   * mehr, als das Gesetz hergibt: Der Betrieb muss nachbessern, für die Nachbesserung zahlst du
   * nichts Neues (§§ 634, 635 BGB). Die Frist ist eine Annahme bis zur Antwort des Anwalts
   * (Rechtsfrage 52). Was nach einer gescheiterten Nachbesserung gilt, sagt die App nicht
   * (Rechtsfrage 53).
   */
  rework: {
    title: 'Die Reparatur ist noch in der Gewährleistung.',
    text: (partner: string) =>
      `${partner} muss die Reparatur nachbessern. Für die Nachbesserung zahlst du nichts Neues.`,
    /** Nur mit Schutz: Der Versicherer bekommt keine neue Meldung */
    noClaim: (insurer: string) => `Eine neue Schadenmeldung an ${insurer} brauchst du dafür nicht.`,
    until: (date: string, months: number) =>
      `Gewährleistung bis ${date}. Angenommen sind ${months} Monate ab der Reparatur.`,
    when: (partner: string) => `${partner} kommt noch einmal. Wann passt es dir?`,
    job: (part: string) => `Nachbesserung: ${part}`,
    costs: 'Keine neuen Kosten für dich, Gewährleistung',
    request: 'Nachbesserung anfragen',
    bookingAnswer: (slot: string, partner: string) =>
      `Nachbesserung anfragen: ${slot} · ${partner}`,
    done: (partner: string) => `${partner} hat nachgebessert.`,
    /** „Problem besteht weiter“ ohne Nachbesserung: warum eine neue Runde beginnt */
    expired: 'Die Gewährleistung für die Reparatur ist vorbei.',
    failed: 'Auch die Nachbesserung hat nicht geholfen.',
    newRound: 'Darum beginnt eine neue Runde.',
  },

  /** Gespräche: mach’s fragt, Antworten stehen unten */
  talk: {
    replies: 'Antworten',
    /** Eingeklappte Antworten beim Hochscrollen (Entscheidung 38): ein Tap zeigt sie wieder */
    repliesCollapsed: (n: number) => (n === 1 ? '1 Antwort' : `${n} Antworten`),
    repliesShow: (n: number) => (n === 1 ? '1 Antwort zeigen' : `${n} Antworten zeigen`),
    edit: (answer: string) => `Antwort ändern: ${answer}`,
    problem: {
      whichDevice: 'Hallo. Für welches Gerät meldest du ein Problem?',
      forDevice: (name: string) => `Es geht um deine ${name}.`,
      addDevice: 'Anderes Gerät hinzufügen',
      whatsUp: 'Was ist los?',
      whatsUpHint: 'Wähl unten, was passt.',
      whatsUpNoGuides: 'Für dieses Gerät holt dir mach’s eine Fachkraft dazu.',
      whichMessage: 'Was steht im Display?',
      describe: 'Beschreib es so, wie du es am Telefon erzählen würdest.',
      next: 'Danke. Wie soll es weitergehen?',
      help: 'Hilfe holen',
      helpSub: 'Eine Fachkraft liest deine Beschreibung vor dem Videocall.',
      assistant: 'Reparatur-Assistent fragen',
      assistantSub: 'Er fragt nach und sucht eine passende Anleitung.',
      send: 'Weiter',
    },
    claim: {
      entry: 'Lieber Schritt für Schritt im Gespräch',
      form: 'Lieber das Formular',
      intro: (finding: string) => `Die Fachkraft hat den Befund aufgenommen: ${finding}.`,
      costs: (repair: string, replacement: string) =>
        `Die Reparatur kostet ${repair}. Ein vergleichbares Ersatzgerät kostet ${replacement}.`,
      payer: (insurer: string, deductible: string) =>
        `Die Kosten prüft ${insurer}. Gibt ${insurer} frei, zahlst du nur deine Selbstbeteiligung von ${deductible}.`,
      rejected: (insurer: string) =>
        `Lehnt ${insurer} ab, entscheidest du neu. Der Kostenvoranschlag bleibt in deiner Fallakte.`,
      ask: (insurer: string) => `Willst du den Schadenfall an ${insurer} melden?`,
      askNoContract: 'Sollen wir einen Fachbetrieb für die Reparatur suchen?',
      askDealer: (service: string) => `Soll ${service} die Reparatur übernehmen?`,
      /** Ohne Schutz, gekauft beim Händler: vor „Fall an … senden“ und Selbstzahlen mit Preis */
      askCosts: 'Wer soll die Kosten übernehmen?',
      reported: (insurer: string) =>
        `Gemeldet. ${insurer} prüft die Kosten. Den Termin kannst du schon anfragen.`,
      selfPay: (amount: string) => `Gut. Du zahlst die Reparatur selbst: ${amount}.`,
      summary: 'So fragen wir den Termin an. Passt alles?',
    },
  },

  /** Der Fall als ein Gespräch (Entscheidung 11) */
  thread: {
    title: (id: string) => `Fall ${id}`,
    details: 'Details',
    toThread: 'Zurück zum Gespräch',
    caseFile: 'Fallakte ansehen',
    photo: (purpose: string) => `Foto: ${purpose}`,
    analysing: 'Ich schaue mir dein Foto an.',
    guideOffer: (title: string, steps: string, source: string) =>
      `Anleitung „${title}“: ${steps} ${source}.`,
    guideRunning: (step: number, total: number) => `Du bist bei Schritt ${step} von ${total}.`,
    continueGuide: 'Anleitung weitermachen',
    outcome: {
      laeuft_wieder: 'Läuft wieder',
      laeuft_nicht: 'Läuft noch nicht',
      geht_nicht: (step: number, title: string) => `Geht nicht bei Schritt ${step}: ${title}`,
      fertig: 'Fertig',
    },
    helpIntro: 'Kein Problem. Wir holen Hilfe.',
    helpText:
      'Am schnellsten geht es im Videocall. Die Fachkraft sieht deine Fallakte und muss nichts doppelt fragen.',
    callStart: 'Videocall starten',
    callSub: 'Wartezeit ca. 1 Minute',
    onSite: 'Vor-Ort-Diagnose',
    onSiteSub: 'Ein Fachbetrieb kommt und schaut es sich an',
    onSiteSubDealer: (service: string) => `${service} kommt und schaut es sich an`,
    callEnded: (expert: string) => `Videocall mit ${expert} beendet.`,
    callAborted: 'Videocall abgebrochen.',
    callbackAsk: 'Wann passt der Rückruf?',
    callbackDone: (slot: string) => `Rückruf angefragt: ${slot}. Die Fachkraft ruft dich an.`,
    findingFrom: (expert: string) => `${expert} · Fachkraft`,
    findingRecommended: (label: string) => `Empfehlung: ${label}.`,
    findingOk: 'Passt, weiter',
    findingWrong: 'Stimmt nicht',
    findingWrongAnswer: 'Der Befund stimmt nicht',
    findingWrongText: 'Wir holen noch einmal Hilfe.',
    findingQuestion: 'Befund',
    solvedInCall: 'Im Call gelöst.',
    replacementNext: (insurer: string) =>
      `${insurer} meldet sich zum Ersatzgerät, sobald die Prüfung fertig ist.`,
    bookingAnswer: (slot: string, partner: string) => `Termin anfragen: ${slot} · ${partner}`,
    diagnosisAsk: 'Wer schaut es sich an?',
    rejectedChoice: {
      selfPay: (amount: string) => `Reparatur selbst zahlen (${amount})`,
      keep: 'Kostenvoranschlag behalten',
      close: 'Fall schließen',
    },
    demoNext: 'Nächster Schritt (Demo)',
    /** Nach einem Widerruf hält der Fall an (R-12). Mit einem Tap geht es weiter. */
    renewAsk: (recipient: string) =>
      `Soll es weitergehen? Dann bestätige die Weitergabe an ${recipient} noch einmal.`,
    renewShare: 'Weitergabe erneut bestätigen',
    done: 'Fertig',
    stillBroken: 'Problem besteht weiter',
    rate: 'Wie zufrieden bist du mit dem Betrieb?',
    cancelled: 'Fall abgebrochen.',
    runningCase: (title: string) => `Für dieses Gerät läuft schon ein Fall: ${title}.`,
    runningCaseAsk: 'Willst du dort weitermachen oder ein neues Problem melden?',
    /**
     * Der Betrieb hat für den laufenden Fall schon den Auftrag, z. B. in der Reparatur. Dann bricht
     * „Neues Problem melden“ ihn nicht nebenbei ab (Entscheidungen Nr. 13 und Nr. 34).
     */
    runningCaseOnlyContinue:
      'Für diesen Fall hat ein Betrieb schon den Auftrag. Abbrechen kannst du ihn im Fall. Dort steht, was das für den Termin heißt.',
    continueCase: 'Weitermachen',
    newProblem: 'Neues Problem melden',
    newProblemReason: 'Neues Problem gemeldet',
    inputLabel: 'Schreib dem Reparatur-Assistenten',
    noteFallback:
      'Der Assistent ist gerade nicht erreichbar. Deine Nachricht geht als Notiz an die Fachkraft.',
    noteQuestion: 'Notiz an die Fachkraft',
  },

  chat: {
    title: 'Reparatur-Assistent',
    intro:
      'Beschreib, was passiert. Der Assistent fragt nach und sagt dir, ob eine Anleitung passt oder ob besser eine Fachkraft hilft.',
    who: 'Ein Computerprogramm, kein Mensch. Es kann sich irren. Bei Gefahr: Stecker ziehen und Hilfe holen.',
    /**
     * Einwilligung in den Assistenten: im Profil unter „Freiwillig“ und, solange sie fehlt, im
     * Sheet nach der ersten Nachricht (Entscheidung 38). Kein Hinweis mehr im Gespräch.
     */
    consentTitle: 'Reparatur-Assistent nutzen',
    /** Darunter stehen die Kategorien aus consentScopes (chat_assistent) als Liste */
    consentText: (provider: string) => `Zur Auswertung bekommt ${provider}:`,
    /**
     * Vorsichtig: Eigene Worte können solche Angaben enthalten. Den Wortlaut legt der Anwalt fest
     * (docs/ANNAHMEN.md, Schritt 26). Fotos aus dem Gespräch stehen in der Liste darüber
     * (Entscheidung 26), die Fotos aus der Fehlererkennung gehen nicht mit.
     */
    consentExcluded:
      'Adresse, Vertragsnummer und die Fotos aus der Fehlererkennung schickt die App nicht mit. Schreib solche Angaben bitte auch nicht selbst in deine Nachrichten.',
    consentBasis:
      'Freiwillig, mit deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie im Profil widerrufen. Ohne Einwilligung hilft dir eine Fachkraft im Videocall.',
    consentAccept: 'Einverstanden',
    consentDecline: 'Lieber eine Fachkraft',
    /** Antwort im Gespräch, solange die Einwilligung fehlt: öffnet das Sheet mit ihrem Text */
    consentOpen: 'Assistent einschalten',
    inputLabel: 'Deine Nachricht',
    send: 'Senden',
    typing: 'Der Assistent schreibt',
    you: 'Du',
    assistant: 'Assistent',
    message: (who: string, text: string) => `${who}: ${text}`,
    startGuide: (title: string) => `Anleitung starten: ${title}`,
    backToGuide: (title: string) => `Zurück zur Anleitung: ${title}`,
    getHelp: 'Hilfe holen',
    tooLong: (max: number) => `Bitte kürzer, höchstens ${max} Zeichen.`,
    /** Nach chatLimits.messages Nachrichten ist Senden aus (R-11) */
    full: 'Das Gespräch ist lang geworden. Eine Fachkraft hilft dir jetzt schneller weiter.',
    /** Dasselbe, wenn die letzte Nachricht keine Antwort mehr bekam */
    fullNoted:
      'Das Gespräch ist lang geworden. Deine letzte Nachricht geht als Notiz an die Fachkraft. Sie hilft dir jetzt schneller weiter.',
    retry: 'Noch einmal senden',
    /** Ohne Netz: die Nachricht für die Fachkraft aufheben */
    saveNote: 'Als Notiz für die Fachkraft speichern',
    noteSaved:
      'Deine Nachricht ist als Notiz für die Fachkraft gespeichert. Sie sieht sie, wenn du Hilfe holst.',
    errors: {
      kein_schluessel:
        'Der Assistent ist auf diesem Rechner noch nicht eingerichtet. Eine Fachkraft hilft dir weiter.',
      schluessel:
        'Der Assistent ist auf diesem Rechner nicht richtig eingerichtet. Eine Fachkraft hilft dir weiter.',
      abgelehnt: 'Dazu kann der Assistent nichts sagen. Eine Fachkraft hilft dir weiter.',
      ausgelastet: 'Der Assistent ist gerade ausgelastet. Versuch es gleich noch einmal.',
      netz: 'Gerade gibt es keine Verbindung. Deine Nachricht ist nicht verloren. Du kannst sie noch einmal senden oder als Notiz für die Fachkraft speichern.',
      dienst:
        'Der Assistent ist gerade nicht erreichbar. Versuch es noch einmal oder hol dir Hilfe.',
      /** 401: Der Pitch-Token fehlt oder ist alt */
      token:
        'Der Assistent ist in dieser Version der App nicht freigeschaltet. Eine Fachkraft hilft dir weiter.',
      /** 429: viele Anfragen in kurzer Zeit */
      zu_viele:
        'Das waren viele Fragen in kurzer Zeit. Warte einen Moment und versuch es dann noch einmal.',
      /** 429: Grenze für heute erreicht */
      tagesgrenze:
        'Der Assistent hat für heute genug Fragen beantwortet. Eine Fachkraft hilft dir weiter.',
    },
    entry: 'Reparatur-Assistent fragen',
    entrySub: 'Beschreib es, der Assistent fragt nach',
    entryLabel: 'Frage an den Reparatur-Assistenten',
    askStep: 'Frag den Assistenten zu diesem Schritt',
    /** Platzhalter im Eingabefeld: hier antwortet der Reparatur-Assistent. Kurz, damit er ganz lesbar bleibt. */
    placeholder: 'Frag den Assistenten',
    placeholderStep: (step: number) => `Frag zu Schritt ${step}`,
    stepDraft: (step: number, title: string) => `Ich hänge bei Schritt ${step}: ${title}. `,
    fileTitle: 'Reparatur-Assistent',
    fileCount: (n: number) => (n === 1 ? '1 Nachricht' : `${n} Nachrichten`),
    // Foto im Gespräch (Entscheidung 26)
    photoButton: 'Foto für den Assistenten aufnehmen',
    photoHelp: 'Nah dran, mit Licht.',
    photoAttached: 'Foto angehängt',
    photoRemove: 'Foto entfernen',
    photoDefault: 'Mache ich das so richtig?',
    photoPreparing: 'Foto wird vorbereitet',
    photoLabel: 'Dein Foto',
    photoDemo: 'Beispielfoto',
    /** Steht vor älteren Nachrichten mit Foto, deren Bild nicht mehr mitgeht */
    photoMarker: '[Foto]',
    assessment: {
      passt: 'Einschätzung: sieht nach dem Schritt aus',
      passt_nicht: 'Einschätzung: sieht anders aus als im Schritt',
      unklar: 'Einschätzung: auf dem Foto nicht zu erkennen',
    },
  },

  // Fall an den Händler (Entscheidung 28, 29)
  sharing: {
    actor: {
      haushalt: 'Haushalt',
      fachkraft: 'Fachkraft im Videocall',
      betrieb: 'Fachbetrieb vor Ort',
      haendler: 'Händler',
    },
    booking: {
      angefragt: 'Angefragt',
      bestaetigt: 'Bestätigt',
      unterwegs: 'Unterwegs',
      erledigt: 'Erledigt',
      storniert: 'Storniert',
    },
    offer: (dealer: string) => `Fall an ${dealer} senden`,
    /** company: Kurzname des Unternehmens, das den Fall prüft (Regulierer, hier der Händler) */
    offerSub: (company: string) => `${company} prüft den Fall`,
    send: 'Ja, senden',
    cancel: 'Doch nicht',
    sent: (dealer: string) => `Gesendet. ${dealer} meldet sich hier im Gespräch.`,
    accepted: (dealer: string) => `${dealer} hat deinen Fall angenommen.`,
    decision: {
      gewaehrleistung: 'Das ist ein Fall für die Gewährleistung. Wir kümmern uns um die Reparatur.',
      kulanz: 'Wir übernehmen das aus Kulanz und kümmern uns um die Reparatur.',
      an_versicherer: 'Das läuft über deine Versicherung. Wir geben den Fall dorthin weiter.',
      abgelehnt: 'Das können wir leider nicht übernehmen.',
    },
    partner: (partner: string, slot?: string) =>
      slot ? `${partner} kommt ${slot}.` : `${partner} meldet sich bei dir für einen Termin.`,
    status: {
      in_pruefung: 'Wir prüfen deinen Fall.',
      ersatzteil_bestellt: 'Das Ersatzteil ist bestellt.',
      abgeschlossen: 'Wir haben den Fall abgeschlossen.',
    },
    defaultOptions: ['Ja', 'Nein'],
    /** Absender im Gespräch: „Sandra K. · Fründ“ */
    sender: (person: string | undefined, dealer: string) =>
      person && person !== dealer ? `${person} · ${dealer}` : dealer,
    slotOffer: (partner: string) => `${partner} kommt zu dir. Wann passt es?`,
    part: (part: string, status: 'bestellt' | 'geliefert', eta?: string) =>
      status === 'geliefert'
        ? `Das Ersatzteil ist da: ${part}.`
        : `Das Ersatzteil ist bestellt: ${part}.${eta ? ` Lieferung in ${eta}.` : ''}`,
    contact: {
      call: 'Anrufen',
      mail: 'E-Mail',
    },
    hours: {
      days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      range: (from: string, to: string) => `${from}–${to} Uhr`,
    },
    /** Eingabefeld: an wen die Nachricht geht */
    recipient: 'Empfänger',
    toAssistant: 'Assistent',
    placeholderDealer: (dealer: string) => `Nachricht an ${dealer}`,
    photoButtonDealer: (dealer: string) => `Foto für ${dealer} aufnehmen`,
    /** Text einer Nachricht an den Händler, die nur ein Foto hat. Liest sich in App und Portal gleich. */
    photoOnly: 'Foto',
    sentTo: (dealer: string) => `An ${dealer}`,
    eventDetail: {
      decision: {
        gewaehrleistung: 'Gewährleistung',
        kulanz: 'Kulanz',
        an_versicherer: 'An den Versicherer',
        abgelehnt: 'Abgelehnt',
      },
      status: {
        in_pruefung: 'In Prüfung',
        ersatzteil_bestellt: 'Ersatzteil bestellt',
        abgeschlossen: 'Abgeschlossen',
      },
    },
  },

  // Händlerportal (portal/, Entscheidungen 30, 33 bis 37). Marke machs.io. Gesiezt, keine Erklärtexte.
  portal: {
    brand: 'machs.io',
    title: 'Händlerportal',
    example: 'Beispiel',
    login: {
      email: 'E-Mail',
      password: 'Passwort',
      submit: 'Anmelden',
      failed: 'E-Mail oder Passwort falsch.',
      offline: 'Backend nicht erreichbar.',
    },
    nav: {
      cases: 'Fälle',
      stats: 'Auswertung',
      settings: 'Einstellungen',
      logout: 'Abmelden',
      label: 'Hauptnavigation',
      open: 'Navigation öffnen',
    },
    workflow: {
      neu: 'Neu',
      wartet_uns: 'Wartet auf uns',
      wartet_kunde: 'Wartet auf Kundschaft',
      termin: 'Termin',
      erledigt: 'Erledigt',
    },
    revoked: 'Widerrufen',
    list: {
      title: 'Fälle',
      empty: 'Keine Fälle.',
      queues: 'Warteschlangen',
      open_: 'Offen',
      all: 'Alle',
      search: 'Suchen',
      searchPlaceholder: 'Fallnummer, Name, Modell, Seriennummer',
      mine: 'Mir zugewiesen',
      view: 'Ansicht',
      viewList: 'Liste',
      viewBoard: 'Tafel',
      open: (id: string) => `Fall ${id} öffnen`,
      select: (id: string) => `Fall ${id} auswählen`,
      selectAll: 'Alle auswählen',
      unassigned: 'Niemand',
      unread: 'Neue Nachricht',
      selected: (n: number) => (n === 1 ? '1 ausgewählt' : `${n} ausgewählt`),
      bulkAccept: 'Annehmen',
      bulkAssign: 'Zuweisen',
      bulkState: 'Stand',
      bulkClear: 'Auswahl aufheben',
      bulkDone: (n: number) => (n === 1 ? '1 Fall geändert' : `${n} Fälle geändert`),
      moveTo: (state: string) => `Nach „${state}“ verschieben`,
      columns: {
        case: 'Fall',
        customer: 'Kundschaft',
        problem: 'Problem',
        assignee: 'Zuständig',
        due: 'Frist',
      },
    },
    sla: {
      overdue: (d: string) => `${d} überfällig`,
      left: (d: string) => `noch ${d}`,
      label: 'Frist',
    },
    duration: {
      min: (n: number) => `${n} Min.`,
      h: (n: number) => `${n} Std.`,
      d: (n: number) => (n === 1 ? '1 Tag' : `${n} Tage`),
    },
    live: {
      newCase: (id: string) => `Neuer Fall ${id}`,
      newMessage: (who: string) => `Neue Nachricht von ${who}`,
      open: 'Öffnen',
      dismiss: 'Schließen',
    },
    keys: {
      title: 'Tastenkürzel',
      close: 'Schließen',
      open: 'Tastenkürzel zeigen',
      items: [
        ['/', 'Suchen'],
        ['j  k', 'Nächster, vorheriger Fall'],
        ['x', 'Auswählen'],
        ['↵', 'Öffnen'],
        ['r', 'Antworten'],
        ['n', 'Interne Notiz'],
        ['g  f', 'Fälle'],
        ['g  a', 'Auswertung'],
        ['g  e', 'Einstellungen'],
        ['?', 'Tastenkürzel'],
      ] as [string, string][],
    },
    file: {
      back: 'Fälle',
      case: (id: string) => `Fall ${id}`,
      revoked: 'Weitergabe widerrufen. Daten gelöscht.',
      customer: 'Kundschaft',
      device: 'Gerät',
      model: 'Modell',
      materialNumber: 'M.-Nr.',
      serialNumber: 'Fabrik-Nr.',
      purchased: 'Gekauft',
      protection: 'Versicherung',
      result: 'Ergebnis',
      confidence: { hoch: 'sicher', mittel: 'wahrscheinlich', unsicher: 'unsicher' },
      source: {
        fehlererkennung: 'Fehlererkennung',
        nutzerangabe: 'Angabe Haushalt',
        fachkraft: 'Fachkraft',
        betrieb: 'Fachbetrieb',
      },
      guide: 'Anleitung',
      guideSteps: (done: number, total: number) => `${done} / ${total}`,
      guideAborted: (step: number, title: string) => `Geht nicht bei ${step}: ${title}`,
      note: 'Notiz',
      finding: 'Befund',
      quote: 'Kosten',
      repair: 'Reparatur',
      replacement: 'Neugerät',
      booking: 'Termin',
      photos: 'Fotos',
      photoAlt: (purpose: string, date: string) => `Foto ${purpose}, ${date}`,
      /** Foto, das die Kundschaft mit einer Nachricht geschickt hat */
      photoMessage: 'Nachricht der Kundschaft',
      conversation: 'Gespräch',
      next: 'Als Nächstes',
      assignee: 'Zuständig',
      state: 'Stand',
      notes: 'Interne Notizen',
      internal: 'Intern',
      access: 'Zugriffe',
      details: 'Fallakte',
      rating: (n: number) => `${n} von 5 Sternen`,
      address: 'Adresse',
      shared: 'Gesendet',
    },
    /** Gewährleistungsprüfung aus Kaufdatum und Regeln */
    check: {
      title: 'Prüfung',
      verdict: {
        gewaehrleistung: 'Gewährleistung',
        kulanz: 'Kulanz möglich',
        an_versicherer: 'Versicherung',
        abgelehnt: 'Abgelaufen',
      },
      confirm: {
        gewaehrleistung: 'Gewährleistung bestätigen',
        kulanz: 'Kulanz gewähren',
        an_versicherer: 'An Versicherer geben',
        abgelehnt: 'Ablehnen',
      },
      purchased: (date: string, months: number) => `${date} · ${months} Monate`,
      unknown: 'Kaufdatum fehlt',
      proof: 'Kaufbeleg',
      proofYes: 'liegt vor',
      proofNo: 'fehlt',
      goodwillMax: (eur: string) => `Kulanz bis ${eur}`,
      decided: 'Entschieden',
      other: 'Anders entscheiden',
    },
    conversation: {
      you: 'Sie',
      auto: 'automatisch',
      answer: 'Antwort',
      slots: 'Zeitfenster',
      chosen: (slot: string) => `Gewählt: ${slot}`,
      empty: 'Noch keine Nachrichten.',
      contact: 'Kontaktkarte',
      more: (n: number) => (n === 1 ? '1 weiterer Schritt' : `${n} weitere Schritte`),
    },
    composer: {
      label: 'Antwort',
      message: 'Nachricht',
      note: 'Interne Notiz',
      placeholder: (name: string) => `Nachricht an ${name}`,
      notePlaceholder: 'Nur für das Team',
      send: 'Senden',
      save: 'Speichern',
      templates: 'Textbausteine',
      tools: 'Weitere Aktionen',
      question: 'Rückfrage',
      questionText: 'Frage',
      questionOptions: 'Antworten, mit Komma getrennt',
      termin: 'Termin vorschlagen',
      part: 'Ersatzteil',
      partName: 'Teil',
      partStatus: { bestellt: 'Bestellt', geliefert: 'Geliefert' },
      eta: 'Lieferzeit',
      etaPlaceholder: '3 Werktage',
      partner: 'Betrieb',
      slots: 'Zeitfenster',
      photo: 'Foto anfordern',
      video: 'Videocall',
      accept: 'Fall annehmen',
      close: 'Fall abschließen',
      sent: 'Gesendet',
      saved: 'Gespeichert',
      failed: 'Nicht gesendet',
      cancel: 'Abbrechen',
    },
    next: {
      accept: 'Fall annehmen',
      reply: 'Antworten',
      decide: 'Gewährleistung prüfen',
      termin: 'Termin vorschlagen',
      close: 'Fall abschließen',
      waiting: 'Wartet auf Kundschaft',
      done: 'Erledigt',
    },
    decisions: {
      gewaehrleistung: 'Gewährleistung',
      kulanz: 'Kulanz',
      an_versicherer: 'An Versicherer',
      abgelehnt: 'Abgelehnt',
    },
    statuses: {
      in_pruefung: 'In Prüfung',
      ersatzteil_bestellt: 'Ersatzteil bestellt',
      abgeschlossen: 'Abgeschlossen',
    },
    video: {
      title: (name: string) => `Videocall mit ${name}`,
      connecting: 'Verbinden …',
      mic: 'Mikrofon',
      micOff: 'Mikrofon aus',
      cam: 'Kamera',
      camOff: 'Kamera aus',
      shot: 'Foto aufnehmen',
      shotDone: 'Foto in der Fallakte',
      end: 'Auflegen',
      you: 'Sie',
    },
    stats: {
      title: 'Auswertung',
      range: 'Letzte 12 Wochen',
      cases: 'Fälle',
      selfSolved: 'Ohne Einsatz gelöst',
      saved: 'Gespart',
      savedSub: (visits: number, returns: number) =>
        `${visits} Einsätze · ${returns} Rücksendungen`,
      throughput: 'Durchlaufzeit',
      throughputSub: (h: string) => `Erste Antwort ${h}`,
      rating: 'Bewertung',
      ratingSub: (n: number) => (n === 1 ? '1 Bewertung' : `${n} Bewertungen`),
      perWeek: 'Fälle pro Woche',
      week: (d: string) => `Woche ab ${d}`,
      outcome: {
        selbst_geloest: 'Selbst gelöst',
        im_call_geloest: 'Im Videocall gelöst',
        haendler: 'An Sie gesendet',
        versicherer: 'Über Versicherung',
        betrieb: 'Fachbetrieb',
      },
      topProblems: 'Häufigste Fehlerbilder',
      byModel: 'Nach Modell',
      share: (p: string) => `${p} %`,
      days: (n: string) => `${n} Tage`,
      hours: (n: string) => `${n} Std.`,
      table: 'Als Tabelle',
      total: 'Gesamt',
    },
    settings: {
      title: 'Einstellungen',
      save: 'Speichern',
      saved: 'Gespeichert',
      failed: 'Nicht gespeichert',
      add: 'Hinzufügen',
      remove: 'Entfernen',
      sections: {
        profile: 'Profil',
        messages: 'Nachrichten',
        team: 'Team',
        rules: 'Regeln',
        service: 'Kundendienst',
        notifications: 'Benachrichtigungen',
        privacy: 'Datenschutz',
        integrations: 'Schnittstellen',
      },
      profile: {
        name: 'Firmenname',
        shortName: 'Kurzname',
        email: 'E-Mail',
        phone: 'Telefon',
        website: 'Website',
        hours: 'Servicezeiten',
        from: 'Von',
        to: 'Bis',
        branches: 'Standorte',
        branch: 'Standort',
        street: 'Straße',
        zip: 'PLZ',
        city: 'Ort',
      },
      messages: {
        greeting: 'Begrüßung',
        away: 'Abwesenheit',
        enabled: 'Aktiv',
        placeholders: 'Platzhalter',
        templates: 'Textbausteine',
        templateTitle: 'Titel',
        templateText: 'Text',
        questions: 'Rückfragen',
        question: 'Frage',
        options: 'Antworten',
        preview: 'Vorschau',
      },
      team: {
        name: 'Name',
        role: 'Rolle',
        email: 'E-Mail',
        branch: 'Standort',
        active: 'Aktiv',
        roles: {
          leitung: 'Leitung',
          sachbearbeitung: 'Sachbearbeitung',
          technik: 'Technik',
          lesen: 'Nur lesen',
        },
        none: '–',
        you: 'Sie',
      },
      rules: {
        intake: 'Eingang',
        autoAccept: 'Automatisch annehmen',
        requestProof: 'Kaufbeleg anfordern, wenn er fehlt',
        autoAssign: 'Automatisch zuweisen',
        warranty: 'Gewährleistung und Kulanz',
        warrantyMonths: 'Gewährleistung, Monate',
        goodwillMonths: 'Kulanz danach, Monate',
        goodwillMax: 'Kulanz bis, Euro',
        sla: 'Fristen',
        slaFirst: 'Erste Reaktion, Stunden',
        slaReply: 'Antwort, Stunden',
      },
      service: {
        own: 'Eigener Kundendienst',
        name: 'Name',
        area: 'Einsatzgebiet, PLZ-Anfänge',
        slots: 'Zeitfenster, eines pro Zeile',
        prices: 'Preise',
        travel: 'Anfahrt, Euro',
        hour: 'Stundensatz, Euro',
        partners: 'Partnerbetriebe',
        authorized: 'Autorisiert',
        savings: 'Ersparnis für die Auswertung',
        visit: 'Vermiedener Einsatz, Euro',
        return: 'Vermiedene Rücksendung, Euro',
      },
      notifications: {
        event: 'Ereignis',
        email: 'E-Mail',
        push: 'Push',
        newCase: 'Neuer Fall',
        overdue: 'Frist überschritten',
        customerReply: 'Antwort der Kundschaft',
        dailyReport: 'Tagesbericht',
        recipients: 'Empfänger',
      },
      privacy: {
        retention: 'Löschfrist',
        months: (n: number) => `${n} Monate`,
        avv: 'Auftragsverarbeitungsvertrag',
        avvSigned: (date: string) => `Unterzeichnet ${date}`,
        avvMissing: 'Nicht unterzeichnet',
        accessLog: 'Zugriffsprotokoll',
        log: 'Letzte Zugriffe',
        logCase: 'Fall',
        logBy: 'Wer',
        logAt: 'Wann',
      },
      integrations: {
        connected: 'Verbunden',
        connect: 'Verbinden',
        disconnect: 'Trennen',
        groups: {
          erp: 'Warenwirtschaft und Buchhaltung',
          calendar: 'Kalender und Einsatzplanung',
          communication: 'Kommunikation',
          shipping: 'Versand und Retouren',
          shop: 'Shop und Marktplätze',
          crm: 'Kundenservice und CRM',
          payment: 'Zahlung',
          reviews: 'Bewertungen',
          automation: 'Automatisierung',
        },
        connectLabel: (name: string) => `${name} verbinden`,
        disconnectLabel: (name: string) => `${name} trennen`,
      },
    },
  },

  profile: {
    person: 'Du',
    name: 'Name',
    address: 'Adresse',
    protection: 'Schutz',
    linkProtection: 'Schutz verknüpfen',
    consents: 'Weitergaben und Einwilligungen',
    noConsents: 'Noch keine Weitergaben.',
    basis: { vertrag: 'Für deine Anfrage', einwilligung: 'Einwilligung' },
    consentLine: (recipient: string, basis: string, date: string) =>
      `${recipient} · ${basis} · ${date}`,
    revoke: 'Widerrufen',
    revokeLabel: (purpose: string, recipient: string) => `${purpose} an ${recipient} widerrufen`,
    revokedOn: (date: string) => `Widerrufen am ${date}`,
    optional: 'Freiwillig',
    manufacturerCase: (manufacturer: string) => `Einzelfälle an ${manufacturer} weitergeben`,
    /** data: die Kategorien aus consentScopes (hersteller_einzelfall), mit de.common.list */
    manufacturerCaseSub: (data: string) =>
      `Mit ${data}, damit der Hersteller Fehler besser versteht. Ohne dein Ja gehen nur Zahlen ohne Personenbezug an den Hersteller.`,
    notifications: 'Mitteilungen zum Fall-Status',
    notificationsSub: 'Wenn sich bei Freigabe oder Termin etwas ändert.',
    /** Die Einstellungen lassen sich nicht öffnen */
    notificationsSettings: 'Mitteilungen erlaubst du in den Einstellungen deines Telefons.',
    notificationsWeb: 'Mitteilungen gibt es nur in der App auf deinem Telefon.',
    appearance: 'Darstellung',
    consentsCount: (n: number) => (n === 0 ? 'Keine aktiv' : n === 1 ? '1 aktiv' : `${n} aktiv`),
    optionalCount: (n: number) => (n === 0 ? 'Alles aus' : n === 1 ? '1 an' : `${n} an`),
    appearanceOptions: { system: 'Wie System', hell: 'Hell', dunkel: 'Dunkel' },
    privacy: 'Datenschutz',
    privacyText:
      'Verantwortlich ist mach’s. Wir speichern Fotos, Gerätedaten, Schritte und Befunde zu deinen Fällen. Weitergegeben wird nur, was du vorher bestätigst. Du hast das Recht auf Auskunft, Berichtigung, Löschung und Widerspruch.',
    /** Wer was sieht, wenn du auf die Weitergabe tippst (Entscheidung 38, lib/legalTexts.ts) */
    privacyWho: 'Wer was sieht',
    /** data: die Kategorien aus consentScopes, mit de.common.list */
    privacyRecipient: (who: string, data: string) => `${who}: ${data}.`,
    recipients: {
      fachkraft: 'Fachkraft im Videocall und beim Rückruf',
      haendler: 'Händler, wenn du ihm den Fall sendest',
      betrieb: 'Betrieb beim Termin',
      versicherer: 'Versicherer bei der Schadenmeldung',
    },
    privacyShareBasis:
      'Grundlage ist deine Anfrage (Art. 6 Abs. 1 lit. b DSGVO). Ohne deinen Tap geht nichts weiter. Eine Weitergabe kannst du unter „Weitergaben und Einwilligungen“ widerrufen.',
    version: (v: string) => `Version ${v}`,
    demo: 'Demo',
  },

  /** Schließbare Tipps im Demo-Modus. Mit „Hinweise aus“ verschwinden sie und alle anderen Demo-Spuren. */
  demoHints: {
    label: 'Demo',
    dismiss: 'Tipp schließen',
    home: 'Tippe auf „Was ist kaputt?“.',
    problem: 'Tippe auf „Foto machen“ oder wähle „Display zeigt eine Meldung“.',
    kamera: 'Wähle, was du fotografierst, und tippe auf den Auslöser.',
    ergebnis: 'Starte die Anleitung. „Passt nicht“ führt zurück.',
    anleitung: 'Tippe dich mit „Erledigt“ durch. „Geht nicht“ zeigt, wie mach’s Hilfe holt.',
    hilfe: 'Starte den Videocall.',
    kosten: 'Klapp „Das geht an …“ auf: So kommt der Fall beim Versicherer an.',
    status: 'Mit „Nächster Schritt (Demo)“ springst du durch Freigabe und Termin.',
    profil: 'Tippe 7-mal auf die Versionsnummer für die Demo-Steuerung.',
    thread:
      'Antworte unten. „Details“ zeigt alles auf einen Blick. Eigene Fragen beantwortet der Reparatur-Assistent.',
  },

  demoControl: {
    title: 'Demo-Steuerung',
    diagnosis: 'Intelligente Fehlererkennung',
    diagnosisOptions: { standard: 'Standard', unsicher: 'Unsicher', unscharf: 'Unscharf' },
    scan: 'Typenschild',
    scanOptions: { erkannt: 'Erkannt', nicht_erkannt: 'Nicht erkannt' },
    video: 'Videocall',
    videoOptions: { verbunden: 'Fachkraft frei', keine_fachkraft: 'Keine frei' },
    claim: 'Freigabe',
    claimOptions: { freigeben: 'Freigeben', ablehnen: 'Ablehnen' },
    deductible: 'Selbstbeteiligung',
    /** Beide Wege nach „Problem besteht weiter“ zeigen (Nr. 32) */
    repairLongAgo: 'Reparatur liegt länger zurück',
    repairLongAgoSub:
      'Dann ist die Gewährleistung vorbei, und nach „Problem besteht weiter“ beginnt eine neue Runde.',
    hints: 'Hinweise und Beispielwerte zeigen',
    hintsSub: 'Aus: keine Demo-Spur in der App.',
    advance: 'Offene Fälle einen Schritt weiter',
    advanced: (n: number) =>
      n === 1 ? '1 Fall weitergeschaltet.' : `${n} Fälle weitergeschaltet.`,
    gallery: 'Komponenten ansehen',
    demoStart: 'Demo-Startstand laden',
    demoStartHint: (dealer: string) =>
      `Ersetzt Geräte, Fälle und Einwilligungen. Danach ist ein Gerät da, gekauft bei ${dealer}, ohne Versicherung und ohne Fall.`,
    demoStartInsurance: 'Demo-Startstand Versicherung',
    demoStartInsuranceHint:
      'Ersetzt Geräte, Fälle und Einwilligungen. Danach ist der Schutz verknüpft, ein Gerät da und kein Fall offen.',
    reset: 'Alles zurücksetzen',
    resetHint: 'Löscht Geräte, Fälle und Einwilligungen und startet das Onboarding neu.',
    close: 'Fertig',
    versionHint: 'Siebenmal tippen öffnet die Demo-Steuerung.',
  },

  closeCase: {
    title: 'Fall schließen',
    text: 'Dein Fortschritt bleibt gespeichert.',
    later: 'Später weitermachen',
    cancel: 'Fall abbrechen',
    reasonTitle: 'Warum brichst du ab?',
    reasons: ['Hat sich erledigt', 'Ich mache es anders', 'Falsches Gerät', 'Anderer Grund'],
    confirmCancel: 'Fall abbrechen',
    keep: 'Weitermachen',
    /** Erledigt oder abgebrochen: nichts mehr zu pausieren oder abzubrechen (R-01) */
    closedText: 'Der Fall ist abgeschlossen. Du findest ihn unter „Fälle“.',
    leave: 'Zur Übersicht',
    /** Mit einem Termin: Der Betrieb bekommt die Absage, auch in der Reparatur (Nr. 34) */
    partnerNotice: (partner: string) => `${partner} bekommt die Absage.`,
    /**
     * Hat der Betrieb den Auftrag schon, sagt mach’s nicht zu, dass keine Kosten entstehen
     * (§ 648 BGB, Rechtsfrage 51). Nie „kostenlos“.
     */
    costsOpen: (partner: string) => `Ob schon Kosten entstanden sind, klärt ${partner} mit dir.`,
    /** Der Betrieb ist fertig: nichts mehr abzusagen, die Antwort gehört ins Gespräch (Nr. 34) */
    repairDone: 'Der Betrieb ist fertig. Sag im Gespräch, ob das Gerät wieder läuft.',
  },

  galerie: {
    title: 'Komponenten',
    intro:
      'Alle Bausteine aus dem Designsystem. Prüfe sie bei 100 % und 200 % Schrift, hell und dunkel.',
    fontScale: 'Schrift',
    scaleOptions: { normal: '100 %', double: '200 %' },
    scheme: 'Darstellung',
    schemeOptions: { system: 'System', light: 'Hell', dark: 'Dunkel' },
    sections: {
      type: 'Typo',
      buttons: 'Buttons',
      forms: 'Eingaben',
      content: 'Inhalte',
      app: 'App-Bausteine',
      feedback: 'Rückmeldung',
    },
    sample: {
      display: 'Reparatur, die mit einem Foto beginnt.',
      h1: 'Wasserablauf gestört',
      title: 'Bevor du anfängst',
      body: 'Stell ein flaches Gefäß unter die Klappe, ein Backblech reicht. Bei verstopftem Ablauf kann viel Wasser kommen.',
      meta: 'Schritt 2 von 7 · aus der Anleitung',
      primary: 'Anleitung starten',
      secondary: 'Geht nicht',
      inverse: 'Läuft wieder',
      link: 'Passt nicht',
      disabled: 'Termin anfragen',
      disabledHint: 'Wähle zuerst ein Zeitfenster.',
      fieldLabel: 'Vertragsnummer',
      fieldPlaceholder: 'z. B. AB-1234-5678',
      /** Beispielwert im Feld mit Fehler */
      fieldValue: 'KV-0000',
      fieldHint: 'Steht auf deinem Vertrag.',
      fieldError: 'Diese Nummer kennen wir nicht. Prüf sie bitte noch einmal.',
      noteLabel: 'Notiz für die Fachkraft (optional)',
      checkbox: 'Der Wasserhahn ist zu',
      chips: ['Mo vormittags', 'Di nachmittags', 'Mi vormittags', 'Do abends'],
      segments: ['Display', 'Typenschild', 'Bauteil'],
      segmentsLabel: 'Was fotografierst du?',
      cardTitle: 'Offener Fall',
      cardText: 'Wasserablauf · Schritt 4 von 7',
      facts: [
        ['Gerät', 'Waschmaschine · 03/2023'],
        ['Meldung', '„Wasserablauf“'],
        ['Bauteil', 'Laugenfilter'],
      ],
      timeline: [
        { when: 'Mo, 26.10. · 19:42', what: 'Problem gemeldet' },
        { when: 'Mo, 26.10. · 19:45', what: 'Ergebnis: Wasserablauf' },
        { when: 'Freigabe', what: 'Dein Versicherer prüft die Kosten', pending: true },
      ],
      navTitle: 'Meldung im Display',
      navSub: 'z. B. Wasserablauf, Waterproof, Fehler F',
      headerTitle: 'Wasserablauf gestört',
      barMeta: 'Schritt 2 von 7',
      barSub: 'aus der Anleitung',
      barAction: 'Erledigt',
      info: 'Die Kosten prüft dein Versicherer nach dem Befund. Selbstbeteiligung laut Vertrag: 0 €.',
      warning: 'Verbrühungsgefahr, wenn kurz vorher heiß gewaschen wurde.',
      photoLabel: 'Klappe der Laugenpumpe',
      selectTitle: 'Fachbetrieb A',
      selectSub: 'Herstellerautorisiert · 2,4 km',
      selectTitle2: 'Fachbetrieb B',
      selectSub2: 'Freie Werkstatt · 3,8 km',
      disclosure: 'Das geht an deinen Versicherer',
      disclosureBody: 'Fotos mit Uhrzeit, Ergebnis, erledigte Schritte und Befund.',
      sheetOpen: 'Sheet öffnen',
      sheetTitle: 'Fall schließen',
      sheetText: 'Dein Fortschritt bleibt gespeichert.',
      sheetAction: 'Später weitermachen',
      toastShow: 'Toast zeigen',
      toast: 'Gespeichert. Du kannst später weitermachen.',
    },
  },
} as const;

export type Strings = typeof de;
