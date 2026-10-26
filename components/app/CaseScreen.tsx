import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';

import { AppHeader, Screen } from '@/components/ds';
import { CloseCaseSheet } from '@/components/nav/CloseCaseSheet';

interface CaseScreenProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  /** Eigener Zurück-Weg, z. B. Schritt zurück in der Anleitung. Standard: router.back() */
  onBack?: () => void;
  /** Kein Zurück, z. B. im Videocall */
  noBack?: boolean;
  scrollRef?: ComponentProps<typeof Screen>['scrollRef'];
}

/** Gerüst für Screens im Fall: Zurück wie Wischgeste und Android-Zurück, X öffnet das Schließen-Sheet. */
export function CaseScreen({
  title,
  children,
  footer,
  scroll,
  onBack,
  noBack,
  scrollRef,
}: CaseScreenProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [closing, setClosing] = useState(false);
  return (
    <Screen
      scroll={scroll}
      scrollRef={scrollRef}
      header={
        <AppHeader
          title={title}
          onBack={noBack ? undefined : (onBack ?? (() => router.back()))}
          onClose={() => setClosing(true)}
        />
      }
      footer={footer}
    >
      {children}
      <CloseCaseSheet caseId={id} visible={closing} onClose={() => setClosing(false)} />
    </Screen>
  );
}

export function useCaseId(): string {
  return useLocalSearchParams<{ id: string }>().id;
}
