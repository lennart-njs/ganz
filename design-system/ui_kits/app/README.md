# App UI kit

Recreation of the ganz consumer app (source: `ganz App Zuhause.dc.html`). Six click-through screens in a phone frame: Willkommen → Meldung → Rückfragen → Diagnose → Anleitung → Fallakte.

- `Phone.jsx` — simple device frame (390×844)
- `Screens.jsx` — one component per screen, composed only from DS components
- Pattern: AppHeader on top, scrolling body with 20px side padding, BottomBar with one full-width primary.
