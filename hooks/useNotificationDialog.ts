// Kommt nach „Termin anfragen“ der Systemdialog für Mitteilungen? Nur dann steht der Satz dazu
// davor, und nur dann ist die Antwort eine Einwilligung (lib/booking.ts). Erlaubt das Telefon
// Mitteilungen schon oder fragt es nicht mehr, kommt kein Dialog. Bis die Antwort da ist: nein.
import { useEffect, useState } from 'react';

import { notifications } from '@/services/notifications';

export function useNotificationDialog(undecided: boolean): boolean {
  const [dialog, setDialog] = useState(false);
  useEffect(() => {
    if (!undecided) return;
    let live = true;
    notifications
      .canAsk()
      .then((v) => live && setDialog(v))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [undecided]);
  return undecided && dialog;
}
