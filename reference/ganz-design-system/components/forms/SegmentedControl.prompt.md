Segmented switch on a stone track; the active segment is a white tile. Used in the site header to switch audience.

```jsx
<SegmentedControl ariaLabel="Zielgruppe wählen" options={['Zu Hause','Hersteller & Handel','Fachbetriebe']} value={aud} onChange={setAud} />
```

- Switching content fades out/in over 200 ms.
