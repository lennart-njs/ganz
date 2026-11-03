'use server';

import { revalidatePath } from 'next/cache';

import { de } from '@/i18n/de';
import type { SettingsSection } from '@/model/portal';

import { getSettings, saveSettings } from '../../../lib/api';
import { sectionFromForm } from '../../../lib/settingsForm';

const t = de.portal.settings;

export interface SaveState {
  ok?: boolean;
  n: number;
  message?: string;
}

export async function save(
  section: SettingsSection,
  prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  const { settings } = await getSettings();
  const ok = await saveSettings(section, sectionFromForm(section, form, settings));
  revalidatePath('/einstellungen', 'layout');
  return { ok, n: prev.n + 1, message: ok ? t.saved : t.failed };
}

/** Schnittstelle verbinden oder trennen (Demo: nur der Schalter) */
export async function toggleIntegration(form: FormData) {
  const { settings } = await getSettings();
  await saveSettings('integrations', sectionFromForm('integrations', form, settings));
  revalidatePath('/einstellungen/schnittstellen');
}
