// Bezeichnungen der Kategorien einer Weitergabe. Sie kommen aus derselben Quelle wie die
// gespeicherte Bestätigung (model/policies/consentScopes.ts, R-14).
import { de } from '@/i18n/de';
import { CONSENT_SCOPES, type DataCategory } from '@/model/policies/consentScopes';
import type { ConsentPurpose } from '@/model/types';

const isCategory = (key: string): key is DataCategory => key in de.dataCategory;

/** Bezeichnungen gespeicherter Kategorien. Ältere Stände speicherten Bezeichnungen statt Schlüssel. */
export function categoryLabels(keys: readonly string[]): string[] {
  return keys.map((key) => (isCategory(key) ? de.dataCategory[key] : key));
}

/** Was eine Weitergabe zu diesem Zweck umfasst, als Bezeichnungen */
export function scopeLabels(purpose: ConsentPurpose): string[] {
  return categoryLabels(CONSENT_SCOPES[purpose].dataCategories);
}

/** Dasselbe als Aufzählung im Satz: „A, B und C“ */
export function scopeList(purpose: ConsentPurpose): string {
  return de.common.list(scopeLabels(purpose));
}
