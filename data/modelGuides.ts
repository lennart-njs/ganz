// Anleitungen aus den Gebrauchsanweisungen der Hersteller (Entscheidung 18).
// Jeder Schritt nennt die Seite und den Originaltext (`src`). Den Schritttext übernehmen wir in
// die Du-Form der App und ändern sonst nur das Nötigste: keine neuen Inhalte, keine Kürzung
// von Warnhinweisen (ANNAHMEN „Anleitungen aus Herstellerunterlagen“).
// Prüfung: __tests__/modelGuides.test.ts
import type { Guide } from '@/model/types';

export const MODEL_SOURCES = {
  g5833: 'Gebrauchsanweisung Miele G 5833 SC, M.-Nr. 12 869 160',
  smi4: 'Gebrauchsanleitung Bosch SMI4EAS24E, 9001882537',
  wq1000: 'Gebrauchsanweisung Miele WQ 1000 WPS, M.-Nr. 12 702 790',
} as const;

export type ModelGuideId =
  | 'g5833_ablauf'
  | 'g5833_siebe'
  | 'g5833_zulauf'
  | 'g5833_start'
  | 'smi4_pumpe'
  | 'smi4_siebe'
  | 'smi4_zulauf'
  | 'smi4_reset'
  | 'wq1000_ablauf'
  | 'wq1000_zulauf'
  | 'wq1000_filter'
  | 'wq1000_fxxx';

const G = MODEL_SOURCES.g5833;
const B = MODEL_SOURCES.smi4;
const W = MODEL_SOURCES.wq1000;

export const modelGuides: Record<ModelGuideId, Guide> = {
  // ---------- Miele G 5833 SC (Geschirrspüler) ----------
  g5833_ablauf: {
    id: 'g5833_ablauf',
    kind: 'stoerung',
    title: 'Wasser bleibt im Spülraum',
    code: 'Fehler im Wasserablauf',
    sourceDocument: G,
    steps: [
      {
        t: 'Vom Netz trennen',
        d: 'Trenn den Geschirrspüler vom Netz. Schalte dazu den Geschirrspüler aus und zieh dann den Netzstecker.',
        src: {
          page: 72,
          text: 'Trennen Sie den Geschirrspüler vom Netz. Schalten Sie dazu den Geschirrspüler aus und ziehen Sie dann den Netzstecker.',
        },
      },
      {
        t: 'Unteren Sprüharm entnehmen',
        d: 'Zieh den Unterkorb heraus. Dreh die Verschraubung des unteren Sprüharms gegen den Uhrzeigersinn (Blickrichtung von oben) und zieh den Sprüharm nach oben ab.',
        src: {
          page: 66,
          text: 'Ziehen Sie den Unterkorb heraus. Drehen Sie die Verschraubung des unteren Sprüharms gegen den Uhrzeigersinn (Blickrichtung von oben) und ziehen Sie den Sprüharm nach oben ab.',
        },
      },
      {
        t: 'Siebkombination herausnehmen',
        d: 'Bevor du die Siebkombination herausnimmst, entfern grobe Schmutzteile, damit keine Schmutzteile in das Umwälzsystem gelangen. Nimm die Siebkombination heraus.',
        src: {
          page: 69,
          text: 'Bevor Sie die Siebkombination herausnehmen, entfernen Sie grobe Schmutzteile, damit keine Schmutzteile in das Umwälzsystem gelangen. Nehmen Sie die Siebkombination heraus.',
        },
      },
      {
        t: 'Wasser ausschöpfen',
        d: 'Schöpf das Wasser mit einem kleinen Gefäß aus dem Spülraum.',
        tool: 'Kleines Gefäß',
        src: {
          page: 72,
          text: 'Schöpfen Sie das Wasser mit einem kleinen Gefäß aus dem Spülraum.',
        },
      },
      {
        t: 'Abdeckung der Ablaufpumpe abnehmen',
        d: 'Drück die Verriegelung der Abdeckung der Ablaufpumpe nach innen. Kipp die Abdeckung nach innen, bis sie sich entnehmen lässt. Spül die Abdeckung unter fließendem Wasser gut aus und entfern alle Fremdkörper.',
        img: 'pumpe',
        src: {
          page: 72,
          text: 'Drücken Sie die Verriegelung der Abdeckung der Ablaufpumpe nach innen. Kippen Sie die Abdeckung nach innen, bis sie sich entnehmen lässt. Spülen Sie die Abdeckung unter fließendem Wasser gut aus und entfernen Sie alle Fremdkörper.',
        },
      },
      {
        t: 'Ablaufpumpe reinigen',
        d: 'Entfern vorsichtig alle Fremdkörper aus der Ablaufpumpe. Dreh zur Kontrolle das Laufrad der Ablaufpumpe von Hand. Das Laufrad lässt sich dabei nur ruckartig drehen.',
        w: 'Verletzungsgefahr durch Glassplitter. Glassplitter sind in der Ablaufpumpe besonders schlecht zu sehen. Reinige die Ablaufpumpe vorsichtig.',
        img: 'pumpe',
        src: {
          page: 73,
          text: 'Verletzungsgefahr durch Glassplitter. Glassplitter sind in der Ablaufpumpe besonders schlecht zu sehen. Reinigen Sie die Ablaufpumpe vorsichtig. Entfernen Sie vorsichtig alle Fremdkörper aus der Ablaufpumpe. Drehen Sie zur Kontrolle das Laufrad der Ablaufpumpe von Hand. Das Laufrad lässt sich dabei nur ruckartig drehen.',
        },
      },
      {
        t: 'Abdeckung einsetzen',
        d: 'Setz die Abdeckung senkrecht von oben wieder ein. Raste die Verriegelung unbedingt ein.',
        src: {
          page: 73,
          text: 'Setzen Sie die Abdeckung senkrecht von oben wieder ein. Rasten Sie die Verriegelung unbedingt ein.',
        },
      },
      {
        t: 'Siebe reinigen und einlegen',
        d: 'Zieh den Mikrofilter an dem Kunststoffring nach unten von der Siebkombination ab. Reinige alle Teile unter fließendem Wasser. Steck den Mikrofilter wieder auf die Siebkombination. Leg die Siebkombination so ein, dass sie glatt am Spülraumboden anliegt.',
        tool: 'Spülbürste',
        src: {
          page: 70,
          text: 'Zum Reinigen der Siebinnenseite ziehen Sie den Mikrofilter an dem Kunststoffring nach unten von der Siebkombination ab. Reinigen Sie alle Teile unter fließendem Wasser. Benutzen Sie zum Säubern eventuell eine Spülbürste. Stecken Sie den Mikrofilter wieder auf die Siebkombination. Legen Sie die Siebkombination so ein, dass sie glatt am Spülraumboden anliegt.',
        },
      },
      {
        t: 'Unteren Sprüharm einsetzen',
        d: 'Setz den unteren Sprüharm mit der Verschraubung wieder auf die Siebkombination. Dreh die Verschraubung im Uhrzeigersinn, bis der Pfeil im Sichtfenster auf das Schlosssymbol zeigt.',
        w: 'Spül nicht ohne unteren Sprüharm und ohne Siebe. Ohne Siebe können grobe Schmutzteile in das Umwälzsystem gelangen und es verstopfen.',
        src: {
          page: 70,
          text: 'Setzen Sie den unteren Sprüharm mit der Verschraubung wieder auf die Siebkombination. Drehen Sie die Verschraubung im Uhrzeigersinn, bis der Pfeil im Sichtfenster auf das Schlosssymbol zeigt. Mit dem unteren Sprüharm wird die Siebkombination befestigt. Ohne Siebe können grobe Schmutzteile in das Umwälzsystem gelangen und es verstopfen. Spülen Sie nicht ohne unteren Sprüharm und ohne Siebe.',
        },
      },
      {
        t: 'Ablaufschlauch prüfen',
        d: 'Entfern gegebenenfalls einen Knick oder eine hochstehende Schlaufe aus dem Ablaufschlauch.',
        src: {
          page: 77,
          text: 'Entfernen Sie gegebenenfalls einen Knick oder eine hochstehende Schlaufe aus dem Ablaufschlauch.',
        },
      },
    ],
  },
  g5833_siebe: {
    id: 'g5833_siebe',
    kind: 'stoerung',
    title: 'Geschirr wird nicht sauber',
    code: 'Siebe reinigen',
    sourceDocument: G,
    steps: [
      {
        t: 'Geschirrspüler ausschalten',
        d: 'Schalte den Geschirrspüler aus.',
        src: { page: 69, text: 'Schalten Sie den Geschirrspüler aus.' },
      },
      {
        t: 'Unteren Sprüharm entnehmen',
        d: 'Zieh den Unterkorb heraus. Dreh die Verschraubung des unteren Sprüharms gegen den Uhrzeigersinn (Blickrichtung von oben) und zieh den Sprüharm nach oben ab.',
        src: {
          page: 66,
          text: 'Ziehen Sie den Unterkorb heraus. Drehen Sie die Verschraubung des unteren Sprüharms gegen den Uhrzeigersinn (Blickrichtung von oben) und ziehen Sie den Sprüharm nach oben ab.',
        },
      },
      {
        t: 'Siebkombination herausnehmen',
        d: 'Bevor du die Siebkombination herausnimmst, entfern grobe Schmutzteile, damit keine Schmutzteile in das Umwälzsystem gelangen. Nimm die Siebkombination heraus.',
        src: {
          page: 69,
          text: 'Bevor Sie die Siebkombination herausnehmen, entfernen Sie grobe Schmutzteile, damit keine Schmutzteile in das Umwälzsystem gelangen. Nehmen Sie die Siebkombination heraus.',
        },
      },
      {
        t: 'Siebe reinigen',
        d: 'Zieh den Mikrofilter an dem Kunststoffring nach unten von der Siebkombination ab. Reinige alle Teile unter fließendem Wasser.',
        tool: 'Spülbürste',
        src: {
          page: 70,
          text: 'Zum Reinigen der Siebinnenseite ziehen Sie den Mikrofilter an dem Kunststoffring nach unten von der Siebkombination ab. Reinigen Sie alle Teile unter fließendem Wasser. Benutzen Sie zum Säubern eventuell eine Spülbürste.',
        },
      },
      {
        t: 'Siebe einlegen',
        d: 'Steck den Mikrofilter wieder auf die Siebkombination. Leg die Siebkombination so ein, dass sie glatt am Spülraumboden anliegt.',
        src: {
          page: 70,
          text: 'Stecken Sie den Mikrofilter wieder auf die Siebkombination. Legen Sie die Siebkombination so ein, dass sie glatt am Spülraumboden anliegt.',
        },
      },
      {
        t: 'Unteren Sprüharm einsetzen',
        d: 'Setz den unteren Sprüharm mit der Verschraubung wieder auf die Siebkombination. Dreh die Verschraubung im Uhrzeigersinn, bis der Pfeil im Sichtfenster auf das Schlosssymbol zeigt.',
        w: 'Spül nicht ohne unteren Sprüharm und ohne Siebe. Ohne Siebe können grobe Schmutzteile in das Umwälzsystem gelangen und es verstopfen.',
        src: {
          page: 70,
          text: 'Setzen Sie den unteren Sprüharm mit der Verschraubung wieder auf die Siebkombination. Drehen Sie die Verschraubung im Uhrzeigersinn, bis der Pfeil im Sichtfenster auf das Schlosssymbol zeigt. Mit dem unteren Sprüharm wird die Siebkombination befestigt. Ohne Siebe können grobe Schmutzteile in das Umwälzsystem gelangen und es verstopfen. Spülen Sie nicht ohne unteren Sprüharm und ohne Siebe.',
        },
      },
      {
        t: 'Sprüharme prüfen',
        d: 'Prüf, ob sich die Sprüharme frei drehen lassen.',
        src: { page: 68, text: 'Prüfen Sie, ob sich die Sprüharme frei drehen lassen.' },
      },
    ],
  },
  g5833_zulauf: {
    id: 'g5833_zulauf',
    kind: 'stoerung',
    title: 'Fehler im Wasserzulauf',
    code: 'Fehler im Wasserzulauf',
    sourceDocument: G,
    steps: [
      {
        t: 'Wasserhahn öffnen',
        d: 'Öffne den Wasserhahn vollständig und starte das Programm neu.',
        src: {
          page: 77,
          text: 'Öffnen Sie den Wasserhahn vollständig und starten Sie das Programm neu.',
        },
      },
      {
        t: 'Vom Netz trennen',
        d: 'Läuft weiter kein Wasser ein, reinige das Sieb im Wasserzulauf. Trenn dazu den Geschirrspüler vom Netz. Schalte den Geschirrspüler aus und zieh dann den Netzstecker.',
        w: 'Stromschlaggefahr durch Netzspannung. Das Kunststoffgehäuse des Wasseranschlusses enthält ein elektrisches Ventil. Tauch das Gehäuse nicht in Flüssigkeiten.',
        src: {
          page: 71,
          text: 'Stromschlaggefahr durch Netzspannung. Das Kunststoffgehäuse des Wasseranschlusses enthält ein elektrisches Ventil. Tauchen Sie das Gehäuse nicht in Flüssigkeiten. Trennen Sie den Geschirrspüler vom Netz. Schalten Sie dazu den Geschirrspüler aus und ziehen Sie dann den Netzstecker.',
        },
      },
      {
        t: 'Wassereinlaufventil abschrauben',
        d: 'Schließ den Wasserhahn. Schraub das Wassereinlaufventil ab. Nimm die Dichtscheibe aus der Verschraubung.',
        src: {
          page: 71,
          text: 'Schließen Sie den Wasserhahn. Schrauben Sie das Wassereinlaufventil ab. Nehmen Sie die Dichtscheibe aus der Verschraubung.',
        },
      },
      {
        t: 'Sieb reinigen',
        d: 'Fass den Steg des Kunststoffsiebes mit einer Kombi- oder Spitzzange und zieh das Sieb heraus. Reinige das Sieb unter fließendem Wasser.',
        tool: 'Kombi- oder Spitzzange',
        src: {
          page: 71,
          text: 'Fassen Sie den Steg des Kunststoffsiebes mit einer Kombi- oder Spitzzange und ziehen das Sieb heraus. Reinigen Sie das Sieb unter fließendem Wasser.',
        },
      },
      {
        t: 'Wieder einbauen',
        d: 'Der Wiedereinbau erfolgt in umgekehrter Reihenfolge. Dreh die Verschraubung fest auf den Wasserhahn. Öffne den Wasserhahn langsam. Wenn Wasser austritt, zieh die Verschraubung nach.',
        w: 'Das Schmutzsieb muss nach der Reinigung wieder eingebaut werden.',
        src: {
          page: 71,
          text: 'Der Wiedereinbau erfolgt in umgekehrter Reihenfolge. Drehen Sie die Verschraubung fest auf den Wasserhahn. Öffnen Sie den Wasserhahn langsam. Wenn Wasser austritt, ziehen Sie die Verschraubung nach. Das Schmutzsieb muss nach der Reinigung wieder eingebaut werden.',
        },
      },
    ],
  },
  g5833_start: {
    id: 'g5833_start',
    kind: 'stoerung',
    title: 'Bedienfeld bleibt dunkel',
    code: 'Startet nicht',
    sourceDocument: G,
    steps: [
      {
        t: 'Netzstecker prüfen',
        d: 'Der Netzstecker ist nicht eingesteckt. Steck den Netzstecker ein.',
        src: {
          page: 74,
          text: 'Der Netzstecker ist nicht eingesteckt. Stecken Sie den Netzstecker ein.',
        },
      },
      {
        t: 'Einige Sekunden warten',
        d: 'Kurz vor dem Drücken der Ein/Aus-Taste wurde die Tür geöffnet oder geschlossen. Die Elektronik benötigt einige Sekunden, um betriebsbereit zu sein. Warte einige Sekunden und drück dann die Taste.',
        src: {
          page: 74,
          text: 'Energiemanagement: Kurz vor dem Drücken der Taste wurde die Tür geöffnet oder geschlossen. Dadurch wurde der Geschirrspüler bereits eingeschaltet. Die Elektronik benötigt einige Sekunden, um betriebsbereit zu sein. Warten Sie einige Sekunden, nachdem Sie die Tür geöffnet oder geschlossen haben. Drücken Sie dann die Taste.',
        },
      },
      {
        t: 'Haussicherung prüfen',
        d: 'Die Haussicherung hat ausgelöst. Aktiviere die Sicherung (Mindestabsicherung siehe Typenschild).',
        w: 'Wenn die Sicherung erneut auslöst, ruf den Kundendienst.',
        src: {
          page: 74,
          text: 'Die Haussicherung hat ausgelöst. Aktivieren Sie die Sicherung (Mindestabsicherung siehe Typenschild). Wenn die Sicherung erneut auslöst, rufen Sie den Miele Kundendienst.',
        },
      },
    ],
  },

  // ---------- Bosch SMI4EAS24E (Geschirrspüler) ----------
  smi4_pumpe: {
    id: 'smi4_pumpe',
    kind: 'stoerung',
    title: 'Wasser wird nicht abgepumpt',
    code: 'E:61-02 / E:61-03',
    sourceDocument: B,
    steps: [
      {
        t: 'Vom Stromnetz trennen',
        d: 'Trenn das Gerät vom Stromnetz.',
        src: { page: 52, text: 'Das Gerät vom Stromnetz trennen.' },
      },
      {
        t: 'Geschirrkörbe entnehmen',
        d: 'Nimm den oberen und unteren Geschirrkorb heraus.',
        src: { page: 52, text: 'Den oberen und unteren Geschirrkorb entnehmen.' },
      },
      {
        t: 'Siebsystem entnehmen',
        d: 'Dreh das Grobsieb gegen den Uhrzeigersinn und nimm das Siebsystem heraus. Achte darauf, dass keine Fremdkörper in den Pumpentopf fallen.',
        src: {
          page: 44,
          text: 'Das Grobsieb gegen den Uhrzeigersinn drehen und das Siebsystem herausnehmen. Darauf achten, dass keine Fremdkörper in den Pumpentopf fallen.',
        },
      },
      {
        t: 'Wasser ausschöpfen',
        d: 'Schöpf vorhandenes Wasser aus. Nimm gegebenenfalls einen Schwamm zu Hilfe.',
        tool: 'Schwamm',
        src: {
          page: 52,
          text: 'Vorhandenes Wasser ausschöpfen. Gegebenenfalls einen Schwamm zu Hilfe nehmen.',
        },
      },
      {
        t: 'Pumpenabdeckung entnehmen',
        d: 'Hebel die Pumpenabdeckung mit Hilfe eines Löffels aus und fass sie am Steg. Heb die Pumpenabdeckung schräg nach innen an und nimm sie heraus.',
        tool: 'Löffel',
        img: 'pumpe',
        src: {
          page: 52,
          text: 'Die Pumpenabdeckung mit Hilfe eines Löffels aushebeln und am Steg fassen. Die Pumpenabdeckung schräg nach innen anheben und entnehmen.',
        },
      },
      {
        t: 'Flügelrad freimachen',
        d: 'Jetzt kannst du das Flügelrad mit der Hand erreichen. Entfern Speisereste und Fremdkörper im Bereich des Flügelrads.',
        w: 'Verletzungsgefahr. Scharfe und spitze Gegenstände wie Glasscherben können die Abwasserpumpe blockieren und zu Verletzungen führen. Entfern Fremdkörper vorsichtig.',
        img: 'pumpe',
        src: {
          page: 52,
          text: 'WARNUNG Verletzungsgefahr! Scharfe und spitze Gegenstände wie Glasscherben können die Abwasserpumpe blockieren und zu Verletzungen führen. Fremdkörper vorsichtig entfernen. Jetzt können Sie das Flügelrad mit der Hand erreichen. Speisereste und Fremdkörper im Bereich des Flügelrads entfernen.',
        },
      },
      {
        t: 'Pumpenabdeckung einsetzen',
        d: 'Setz die Pumpenabdeckung ein und drück sie nach unten. Die Pumpenabdeckung rastet hörbar ein.',
        src: {
          page: 52,
          text: 'Die Pumpenabdeckung einsetzen und nach unten drücken. Die Pumpenabdeckung rastet hörbar ein.',
        },
      },
      {
        t: 'Siebsystem und Körbe einsetzen',
        d: 'Bau das Siebsystem ein. Setz den unteren und oberen Geschirrkorb ein.',
        src: {
          page: 52,
          text: 'Das Siebsystem einbauen. Den unteren und oberen Geschirrkorb einsetzen.',
        },
      },
      {
        t: 'Ablaufschlauch prüfen',
        d: 'Prüf den Anschluss am Siphon und öffne ihn bei Bedarf. Verleg den Ablaufschlauch knickfrei.',
        src: {
          page: 48,
          text: 'Prüfen Sie den Anschluss am Siphon und öffnen Sie diesen bei Bedarf. Verlegen Sie den Ablaufschlauch knickfrei.',
        },
      },
    ],
  },
  smi4_siebe: {
    id: 'smi4_siebe',
    kind: 'stoerung',
    title: 'Speisereste auf dem Geschirr',
    code: 'E:92-40',
    sourceDocument: B,
    steps: [
      {
        t: 'Siebsystem herausnehmen',
        d: 'Dreh das Grobsieb gegen den Uhrzeigersinn und nimm das Siebsystem heraus. Achte darauf, dass keine Fremdkörper in den Pumpentopf fallen.',
        src: {
          page: 44,
          text: 'Das Grobsieb gegen den Uhrzeigersinn drehen und das Siebsystem herausnehmen. Darauf achten, dass keine Fremdkörper in den Pumpentopf fallen.',
        },
      },
      {
        t: 'Siebe zerlegen',
        d: 'Zieh das Mikrosieb nach unten ab. Drück die Rastnasen zusammen und nimm das Grobsieb nach oben heraus.',
        src: {
          page: 44,
          text: 'Das Mikrosieb nach unten abziehen. Die Rastnasen zusammendrücken und das Grobsieb nach oben herausnehmen.',
        },
      },
      {
        t: 'Siebe reinigen',
        d: 'Reinige die Siebelemente unter fließendem Wasser. Reinige den Schmutzrand zwischen Grobsieb und Feinsieb sorgfältig.',
        src: {
          page: 44,
          text: 'Unter fließendem Wasser die Siebelemente reinigen. Den Schmutzrand zwischen Grobsieb und Feinsieb sorgfältig reinigen.',
        },
      },
      {
        t: 'Siebsystem einsetzen',
        d: 'Bau das Siebsystem zusammen. Achte darauf, dass am Grobsieb die Rastnasen eingerastet sind. Setz das Siebsystem in das Gerät ein und dreh das Grobsieb im Uhrzeigersinn. Die Pfeilmarkierungen müssen sich gegenüberstehen.',
        src: {
          page: 44,
          text: 'Das Siebsystem zusammenbauen. Beachten Sie, dass am Grobsieb die Rastnasen eingerastet sind. Das Siebsystem in das Gerät einsetzen und das Grobsieb im Uhrzeigersinn drehen. Beachten Sie, dass sich die Pfeilmarkierungen gegenüberstehen.',
        },
      },
      {
        t: 'Sprüharme prüfen',
        d: 'Prüf unter fließendem Wasser die Austrittsdüsen der Sprüharme auf Verstopfungen und entfern gegebenenfalls Fremdkörper.',
        src: {
          page: 45,
          text: 'Unter fließendem Wasser die Austrittsdüsen der Sprüharme auf Verstopfungen prüfen und gegebenenfalls Fremdkörper entfernen.',
        },
      },
      {
        t: 'Geschirr locker einräumen',
        d: 'Räum das Geschirr mit ausreichend Freiraum ein. Die Sprühstrahlen müssen die Geschirroberfläche erreichen.',
        src: {
          page: 49,
          text: 'Räumen Sie das Geschirr mit ausreichend Freiraum ein. Die Sprühstrahlen müssen die Geschirroberfläche erreichen.',
        },
      },
    ],
  },
  smi4_zulauf: {
    id: 'smi4_zulauf',
    kind: 'stoerung',
    title: 'Kein Wasser im Gerät',
    code: 'E:32-00',
    sourceDocument: B,
    steps: [
      {
        t: 'Wasserhahn und Schlauch prüfen',
        d: 'Öffne den Wasserhahn. Verleg den Zulaufschlauch knickfrei.',
        src: {
          page: 46,
          text: 'Verlegen Sie den Zulaufschlauch knickfrei. Öffnen Sie den Wasserhahn.',
        },
      },
      {
        t: 'Strom und Wasser abstellen',
        d: 'Schalte das Gerät aus. Zieh den Netzstecker. Dreh den Wasserhahn zu.',
        src: {
          page: 46,
          text: 'Schalten Sie das Gerät aus. Ziehen Sie den Netzstecker. Drehen Sie den Wasserhahn zu.',
        },
      },
      {
        t: 'Sieb reinigen',
        d: 'Schraub den Wasseranschluss ab. Nimm das Sieb aus dem Zulaufschlauch. Säubere das Sieb.',
        src: {
          page: 46,
          text: 'Schrauben Sie den Wasseranschluss ab. Nehmen Sie das Sieb aus dem Zulaufschlauch. Säubern Sie das Sieb.',
        },
      },
      {
        t: 'Wieder anschließen',
        d: 'Setz das Sieb in den Zulaufschlauch. Schraub den Wasseranschluss an. Prüf den Wasseranschluss auf Dichtigkeit.',
        src: {
          page: 47,
          text: 'Setzen Sie das Sieb in den Zulaufschlauch. Schrauben Sie den Wasseranschluss an. Prüfen Sie den Wasseranschluss auf Dichtigkeit.',
        },
      },
      {
        t: 'Gerät einschalten',
        d: 'Stell die Stromversorgung her. Schalte das Gerät ein.',
        src: {
          page: 47,
          text: 'Stellen Sie die Stromversorgung her. Schalten Sie das Gerät ein.',
        },
      },
    ],
  },
  smi4_reset: {
    id: 'smi4_reset',
    kind: 'stoerung',
    title: 'Alle Anzeigen leuchten oder blinken',
    code: 'Elektronik hat einen Fehler erkannt',
    sourceDocument: B,
    steps: [
      {
        t: 'Gerät zurücksetzen',
        d: 'Drück die Hauptschaltertaste für ca. 4 Sekunden. Das Gerät wird zurückgesetzt und neu gestartet.',
        src: {
          page: 49,
          text: 'Drücken Sie die Hauptschaltertaste für ca. 4 Sekunden. Das Gerät wird zurückgesetzt und neu gestartet.',
        },
      },
      {
        t: 'Vom Strom trennen',
        d: 'Wenn das Problem erneut auftritt: Schalte das Gerät aus. Zieh den Netzstecker oder schalte die Sicherung im Sicherungskasten aus. Warte mindestens 2 Minuten.',
        src: {
          page: 49,
          text: 'Wenn das Problem erneut auftritt: Schalten Sie das Gerät aus. Ziehen Sie den Netzstecker oder schalten Sie die Sicherung im Sicherungskasten aus. Warten Sie mindestens 2 Minuten.',
        },
      },
      {
        t: 'Wieder einschalten',
        d: 'Schalte die Sicherung im Sicherungskasten ein oder steck den Netzstecker ein. Schalte das Gerät ein.',
        w: 'Wenn das Problem erneut auftritt, kontaktiere den Kundendienst.',
        src: {
          page: 49,
          text: 'Schalten Sie die Sicherung im Sicherungskasten ein oder stecken Sie den Netzstecker ein. Schalten Sie das Gerät ein. Wenn das Problem erneut auftritt: Kontaktieren Sie den Kundendienst.',
        },
      },
    ],
  },

  // ---------- Miele WQ 1000 WPS (Waschmaschine) ----------
  wq1000_ablauf: {
    id: 'wq1000_ablauf',
    kind: 'stoerung',
    title: 'Wasserablauf gestört',
    code: 'Fehler F11',
    sourceDocument: W,
    steps: [
      {
        t: 'Sockelklappe abnehmen',
        d: 'Öffne die Sockelklappe um ca. 45°. Löse nacheinander die 3 Rasthaken. Zieh die Sockelklappe nach vorne ab.',
        src: {
          page: 67,
          text: 'Öffnen Sie die Sockelklappe um ca. 45°. Lösen Sie nacheinander die 3 Rasthaken. Ziehen Sie die Sockelklappe nach vorne ab.',
        },
      },
      {
        t: 'Behälter unterstellen',
        d: 'Leg bei einem empfindlichen Boden zur Absicherung ein Handtuch unter. Schieb einen flachen Behälter unter die Ausgießhilfen. Klapp die rechte Ausgießhilfe herunter und drück sie ganz herunter, bis sie spürbar einrastet.',
        tool: 'Flacher Behälter, max. 3 cm hoch, z. B. ein Universalblech',
        src: {
          page: 68,
          text: 'Legen Sie bei einem empfindlichen Boden zur Absicherung ein Handtuch unter. Schieben Sie einen flachen Behälter unter die Ausgießhilfen. Klappen Sie die rechte Ausgießhilfe herunter. Drücken Sie die Ausgießhilfe ganz herunter, bis die Ausgießhilfe spürbar einrastet.',
        },
      },
      {
        t: 'Lauge ablassen',
        d: 'Dreh langsam den rechten Laugenfilter auf, bis die Lauge abläuft. Um den Laugenablauf zu unterbrechen, z. B. zum Entleeren des Behälters, dreh den Laugenfilter wieder zu. Der Vorgang ist abgeschlossen, wenn keine Lauge mehr ausläuft.',
        w: 'Verbrühungsgefahr durch heiße Lauge. Die auslaufende Lauge ist heiß, wenn kurz vorher mit hohen Temperaturen gewaschen wurde. Lass die Lauge vorsichtig ab.',
        img: 'pumpe',
        src: {
          page: 68,
          text: 'Drehen Sie langsam den rechten Laugenfilter auf, bis die Lauge abläuft. Um den Laugenablauf zu unterbrechen (z. B. zum Entleeren des Behälters), drehen Sie den Laugenfilter wieder zu. Der Vorgang ist abgeschlossen, wenn keine Lauge mehr ausläuft. Verbrühungsgefahr durch heiße Lauge. Die auslaufende Lauge ist heiß, wenn kurz vorher mit hohen Temperaturen gewaschen wurde. Lassen Sie die Lauge vorsichtig ab.',
        },
      },
      {
        t: 'Laugenfilter reinigen',
        d: 'Dreh die Laugenfilter ganz heraus und nimm sie heraus. Reinige die Laugenfilter gründlich. Löse die Rasthaken der Deckel der Laugenfilter, nimm die Deckel ab und reinige die Innenseiten.',
        img: 'pumpe',
        src: {
          page: 69,
          text: 'Drehen Sie die Laugenfilter ganz heraus und entnehmen Sie die Laugenfilter. Reinigen Sie die Laugenfilter gründlich. Lösen Sie die Rasthaken der Deckel der Laugenfilter. Nehmen Sie die Deckel ab und reinigen Sie die Innenseiten der Laugenfilter.',
        },
      },
      {
        t: 'Pumpen freimachen',
        d: 'Prüf, ob sich die Pumpenflügel leicht drehen lassen. Entfern vorhandene Fremdkörper (z. B. Knöpfe, Münzen). Reinige den Innenraum gründlich.',
        img: 'pumpe',
        src: {
          page: 70,
          text: 'Prüfen Sie, ob sich die Pumpenflügel leicht drehen lassen. Entfernen Sie vorhandene Fremdkörper (z. B. Knöpfe, Münzen). Reinigen Sie den Innenraum gründlich.',
        },
      },
      {
        t: 'Laugenfilter einsetzen',
        d: 'Setz die Laugenfilter wieder richtig ein (rechts und links beachten) und dreh sie fest zu. Klapp die Ausgießhilfen wieder hoch.',
        w: 'Werden die Laugenfilter nicht wieder eingesetzt und festgedreht, läuft Wasser aus der Waschmaschine.',
        src: {
          page: 70,
          text: 'Setzen Sie die Laugenfilter wieder richtig ein (rechts und links beachten) und drehen Sie die Laugenfilter fest zu. Klappen Sie die Ausgießhilfen wieder hoch. Schäden durch auslaufendes Wasser. Werden die Laugenfilter nicht wieder eingesetzt und festgedreht, läuft Wasser aus der Waschmaschine.',
        },
      },
      {
        t: 'Sockelklappe montieren',
        d: 'Raste die 3 Rasthaken wieder ein. Drück die Außenkante der Sockelklappe leicht nach außen. Schließ die Sockelklappe.',
        src: {
          page: 71,
          text: 'Rasten Sie die 3 Rasthaken wieder ein. Drücken Sie die Außenkante der Sockelklappe leicht nach außen. Schließen Sie die Sockelklappe.',
        },
      },
      {
        t: 'Ablaufschlauch prüfen',
        d: 'Der Ablaufschlauch darf nicht zu hoch liegen. Beachte die maximale Abpumphöhe von 1,0 m.',
        src: {
          page: 61,
          text: 'Der Ablaufschlauch liegt zu hoch. Beachten Sie die maximale Abpumphöhe von 1,0 m.',
        },
      },
    ],
  },
  wq1000_zulauf: {
    id: 'wq1000_zulauf',
    kind: 'stoerung',
    title: 'Wasserzulauf gestört',
    code: 'Fehler F10',
    sourceDocument: W,
    steps: [
      {
        t: 'Wasserhahn prüfen',
        d: 'Prüf, ob der Wasserhahn geöffnet oder weit genug geöffnet ist.',
        src: {
          page: 61,
          text: 'Prüfen Sie, ob der Wasserhahn geöffnet oder weit genug geöffnet ist.',
        },
      },
      {
        t: 'Zulaufschlauch prüfen',
        d: 'Prüf, ob der Wasserzulaufschlauch geknickt ist.',
        src: { page: 61, text: 'Prüfen Sie, ob der Wasserzulaufschlauch geknickt ist.' },
      },
      {
        t: 'Wasserdruck prüfen',
        d: 'Prüf, ob der Wasseranschlussdruck ausreichend ist. Der Mindestdruck beträgt 100 kPa (1 bar). Liegt er dauerhaft darunter, kann die Einstellung „Niedriger Wasserdruck“ aktiviert werden.',
        src: {
          page: 61,
          text: 'Prüfen Sie, ob der Wasseranschlussdruck ausreichend ist. Der Mindestdruck beträgt 100 kPa (1 bar). Wenn der Wasseranschlussdruck dauerhaft unter dem Mindestwert liegt, kann die Einstellung „Niedriger Wasserdruck“ aktiviert werden.',
        },
      },
    ],
  },
  wq1000_filter: {
    id: 'wq1000_filter',
    kind: 'stoerung',
    title: 'Undichtigkeit am Laugenfilter',
    code: 'Fehler F373',
    sourceDocument: W,
    steps: [
      {
        t: 'Laugenfilter festdrehen',
        d: 'Überprüf den Laugenfilter und dreh den Laugenfilter nochmals fest.',
        src: {
          page: 61,
          text: 'Überprüfen Sie den Laugenfilter und drehen Sie den Laugenfilter nochmals fest.',
        },
      },
      {
        t: 'Aus- und einschalten',
        d: 'Schalte die Waschmaschine aus und wieder ein.',
        w: 'Wenn der Fehler erneut auftritt, kontaktiere den Kundendienst.',
        src: {
          page: 61,
          text: 'Schalten Sie die Waschmaschine aus und wieder ein. Wenn der Fehler erneut auftritt, kontaktieren Sie den Miele Kundendienst.',
        },
      },
    ],
  },
  wq1000_fxxx: {
    id: 'wq1000_fxxx',
    kind: 'stoerung',
    title: 'Fehler F mit Nummer',
    code: 'Fehler FXXX',
    sourceDocument: W,
    steps: [
      {
        t: 'Vom Stromnetz trennen',
        d: 'Zieh den Netzstecker aus der Steckdose oder schalte die Sicherung der Hausinstallation aus. Trenn die Waschmaschine mindestens 2 Minuten vom Stromnetz.',
        src: {
          page: 62,
          text: 'Trennen Sie die Waschmaschine vom Stromnetz. Ziehen Sie den Netzstecker aus der Steckdose oder schalten Sie die Sicherung der Hausinstallation aus. Die Waschmaschine mindestens 2 Minuten vom Stromnetz trennen.',
        },
      },
      {
        t: 'Wieder einschalten',
        d: 'Verbinde die Waschmaschine wieder mit dem Stromnetz. Schalte die Waschmaschine wieder ein. Starte das Programm nochmals.',
        w: 'Wenn der Fehler erneut auftritt, kontaktiere den Kundendienst.',
        src: {
          page: 62,
          text: 'Verbinden Sie die Waschmaschine wieder mit dem Stromnetz. Schalten Sie die Waschmaschine wieder ein. Starten Sie das Programm nochmals. Wenn der Fehler erneut auftritt, kontaktieren Sie den Miele Kundendienst.',
        },
      },
    ],
  },
};
