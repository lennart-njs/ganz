import { act, fireEvent, screen } from 'expo-router/testing-library';

/** Klappt alle eingeklappten Abschnitte auf (Übersichtsseiten sind standardmäßig zu, Entscheidung 23) */
export async function openAll() {
  for (let round = 0; round < 3; round++) {
    const closed = screen.queryAllByRole('button', { expanded: false });
    if (closed.length === 0) return;
    for (const b of closed) await fireEvent.press(b);
    await act(async () => {});
  }
}
