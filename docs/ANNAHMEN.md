# Annahmen aus Phase 2

Annahmen, die ich beim Bauen getroffen habe. Jede lässt sich ändern.

## Schritt 1: Setup

- **Expo SDK 58** ist das aktuelle stabile SDK (npm `expo@latest` = 58.0.19, Stand 26.10.2026). Expo Go aus App Store und Play Store unterstützt nur das jeweils aktuelle SDK.
- **Ordner `app/` im Wurzelverzeichnis** wie im Bauplan, nicht `src/app/` wie in der neuen Expo-Vorlage. Der Import-Alias `@/` zeigt auf das Wurzelverzeichnis.
- **Kein eigenes App-Icon und kein Splash-Bild.** Die Vorlage bringt Expo-Logos mit, die nutze ich nicht. Expo Go braucht kein Icon.
- **Prettier formatiert keine Markdown-Dateien**, damit die Dokumente aus Phase 1 unverändert bleiben.
