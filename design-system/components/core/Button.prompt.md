Action button for ganz — ink-filled primary, stone-bordered secondary, light inverse for dark or photo backgrounds, and an underlined link style for escape paths.

```jsx
<Button variant="primary" size="lg" fullWidth>Anleitung starten</Button>
<Button variant="secondary">Ja, alles gut</Button>
<Button variant="link">Ich komme nicht weiter. Fachkraft per Video</Button>
```

- One primary per screen. In the app the primary is full width in a bottom bar (size="lg").
- Disabled = 40 % opacity, still visible; explain why via Toast on tap.
- On hero photos pair `inverse` with `outlineOnPhoto`.
