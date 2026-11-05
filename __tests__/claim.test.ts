// Herstelleranfrage (Portal-Idee 5): vorausgefüllt, ohne Daten zur Person
import { fruendSettings } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { warrantyCheck } from '@/portal/lib/check';
import { manufacturerClaim } from '@/portal/lib/claim';
import { seedRecords } from '@/server/backend/seed';

const records = seedRecords(Date.parse('2026-11-05T09:00:00+01:00'));
const s = fruendSettings;

describe('Herstelleranfrage', () => {
  it('nennt Gerät, Fehler und Grundlage, aber nicht die Kundschaft', () => {
    for (const r of records) {
      const claim = manufacturerClaim(r, warrantyCheck(r.file, s.rules, r), s.profile.name);
      const f = r.file;
      expect(claim.text.split('\n')[0]).toBe(de.portal.claim.subject(f.caseId));
      expect(claim.text).toContain(f.device.manufacturer);
      expect(claim.text).toContain(f.device.model);
      expect(claim.text).toContain(f.case.problemLabel);
      if (f.device.serialNumber) expect(claim.text).toContain(f.device.serialNumber);
      expect(claim.facts.map(([k]) => k)).toContain(de.portal.check.basis);
      expect(claim.text).not.toContain(f.customer.name);
      if (f.customer.address) {
        expect(claim.text).not.toContain(f.customer.address.street);
        expect(claim.text).not.toContain(f.customer.address.zip);
      }
      for (const [, v] of claim.facts) expect(v.trim()).not.toBe('');
    }
  });
});
