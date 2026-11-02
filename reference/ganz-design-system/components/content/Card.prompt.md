Flat white card with 14px radius. No borders, no shadow unless it floats over a photo.

```jsx
<Card media="assets/web/b-flusensieb.jpg">
  <CardTitle>Diagnose</CardTitle>
  <CardText>Beschreib das Problem, nenn den Fehlercode, mach ein Foto.</CardText>
</Card>
<Card tone="inverse" padding={56}>…</Card>
```

- Cards sit on `--bg-page` (stone). Never white card on white.
- Do not add coloured left borders or icons in circles.
