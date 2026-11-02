Selectable chip for device type or appointment slots. Selected fills ink.

```jsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
  {types.map(t => <ChoiceChip key={t} selected={t === type} onClick={() => setType(t)}>{t}</ChoiceChip>)}
</div>
<ChoiceChip sub="10–12 Uhr" selected>Do, 16.10.</ChoiceChip>
```
