import { router, useLocalSearchParams, type Href } from 'expo-router';

import { PlaceholderScreen, type PlaceholderAction } from './PlaceholderScreen';

type Nav = 'push' | 'replace' | 'dismissTo';

export interface CaseLink {
  label: string;
  /** Ziel relativ zum Fall, z. B. 'kamera'. Absolute Pfade beginnen mit '/'. */
  to: string;
  nav?: Nav;
}

interface CasePlaceholderProps {
  title: string;
  step: number;
  links?: CaseLink[];
  primary?: CaseLink;
}

export function caseHref(caseId: string, to: string): Href {
  return (to.startsWith('/') ? to : `/fall/${caseId}/${to}`) as Href;
}

/** Platzhalter im Fall-Stack: Zurück wie Wischgeste und Android-Zurück, X öffnet das Schließen-Sheet. */
export function CasePlaceholder({ title, step, links = [], primary }: CasePlaceholderProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toAction = (l: CaseLink): PlaceholderAction => ({
    label: l.label,
    onPress: () => router[l.nav ?? 'push'](caseHref(id, l.to)),
  });
  return (
    <PlaceholderScreen
      title={title}
      step={step}
      inCase
      caseId={id}
      actions={links.map(toAction)}
      primary={primary ? toAction(primary) : undefined}
    />
  );
}
