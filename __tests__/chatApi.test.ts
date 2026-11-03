/**
 * @jest-environment node
 */
import { POST } from '@/app/api/chat+api';
import { chatLimits } from '@/lib/chat/limits';
import {
  STABLE_SYSTEM,
  caseSystem,
  cleanText,
  parseReply,
  parseRequest,
  type ChatContext,
} from '@/lib/chat/prompt';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk');
  class MockAnthropic {
    beta = { messages: { create: mockCreate } };
    static APIError = actual.APIError;
    static AuthenticationError = actual.AuthenticationError;
    static RateLimitError = actual.RateLimitError;
  }
  return { __esModule: true, default: MockAnthropic };
});

const context: ChatContext = {
  category: 'waschmaschine',
  categoryLabel: 'Waschmaschine',
  device: 'WKB 130',
  manufacturer: 'Miele',
  problem: 'Wasserablauf gestört',
  hasProtection: true,
};

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const answer = (json: object, stop_reason = 'end_turn') => ({
  stop_reason,
  content: [
    { type: 'thinking', thinking: '', signature: 'x' },
    { type: 'text', text: JSON.stringify(json) },
  ],
});

const ask = { context, messages: [{ role: 'haushalt', text: 'Es bleibt Wasser stehen.' }] };

beforeEach(() => {
  mockCreate.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test';
});

describe('Server-Route des Reparatur-Assistenten', () => {
  test('ohne Schlüssel: 503 und kein Aufruf', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await post(ask);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'kein_schluessel' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('ungültige Anfragen werden abgelehnt', async () => {
    expect((await post('kein json')).status).toBe(400);
    expect((await post({ context, messages: [] })).status).toBe(400);
    expect((await post({ context, messages: [{ role: 'assistent', text: 'Hallo' }] })).status).toBe(
      400,
    );
    expect(
      (await post({ context, messages: [{ role: 'haushalt', text: 'x'.repeat(1300) }] })).status,
    ).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('Grenze von 40 Nachrichten: ein volles Gespräch gibt 413 „voll“ ohne Aufruf (R-11)', async () => {
    const turns = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        role: i % 2 === 0 ? 'haushalt' : 'assistent',
        text: `Nachricht ${i + 1}`,
      }));
    const last = { role: 'haushalt', text: 'Noch eine Frage' };
    // 40 Nachrichten in der Anfrage ließen keinen Platz für die Antwort
    for (const messages of [[...turns(chatLimits.messages - 1), last], turns(41)]) {
      const res = await post({ context, messages });
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual({ error: 'voll' });
    }
    expect(mockCreate).not.toHaveBeenCalled();
    // 39 Nachrichten: Die Antwort ist die 40.
    mockCreate.mockResolvedValue(answer({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    const res = await post({ context, messages: turns(chatLimits.messages - 1) });
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].messages).toHaveLength(chatLimits.messages - 1);
  });

  test('Anfrage an Claude: Modell, Format, Cache, Fallback, Verlauf', async () => {
    mockCreate.mockResolvedValue(
      answer({
        reply: 'Das klingt nach dem Laugenfilter.',
        suggestion: 'anleitung',
        guideId: 'ablauf',
      }),
    );
    const res = await post({
      context,
      messages: [
        { role: 'haushalt', text: 'Es bleibt Wasser stehen.' },
        { role: 'assistent', text: 'Steht das Wasser in der Trommel?' },
        { role: 'haushalt', text: 'Ja.' },
      ],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reply: 'Das klingt nach dem Laugenfilter.',
      suggestion: 'anleitung',
      guideId: 'ablauf',
    });
    const params = mockCreate.mock.calls[0][0];
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
      output_config: { effort: 'low', format: { type: 'json_schema' } },
    });
    expect(params).not.toHaveProperty('thinking');
    expect(params.system[0]).toEqual({
      type: 'text',
      text: STABLE_SYSTEM,
      cache_control: { type: 'ephemeral' },
    });
    expect(params.system[1].text).toBe(caseSystem(context));
    expect(params.messages.map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
    ]);
  });

  test('der feste Teil des Systemprompts hängt nicht vom Fall ab', () => {
    // Alle Anleitungen stehen im festen Teil, der Fall nur im zweiten Block
    expect(STABLE_SYSTEM).toContain('<anleitung id="ablauf"');
    expect(STABLE_SYSTEM).not.toContain('<fall>');
    expect(caseSystem(context)).toContain('Waschmaschine, WKB 130 von Miele');
    // Keine Kostenzusage, keine Links, Hilfe bei Gefahr
    expect(STABLE_SYSTEM).toMatch(/Keine Aussage dazu, wer Kosten übernimmt/);
    expect(STABLE_SYSTEM).toMatch(/Keine Links/);
    expect(STABLE_SYSTEM).toMatch(/Stecker ziehen/);
  });

  test('keine Anleitung für andere Geräte, auch wenn das Modell eine vorschlägt', () => {
    const raw = JSON.stringify({
      reply: 'Probier die Anleitung.',
      suggestion: 'anleitung',
      guideId: 'ablauf',
    });
    expect(parseReply(raw, 'kuehlschrank')).toEqual({
      reply: 'Probier die Anleitung.',
      suggestion: 'keine',
      guideId: '',
    });
    expect(
      parseReply('{"reply":"x","suggestion":"anleitung","guideId":"gibtsnicht"}', 'waschmaschine'),
    ).toMatchObject({ suggestion: 'keine' });
    expect(parseReply('kein json', 'waschmaschine')).toBeNull();
  });

  test('Ablehnung, Abbruch und Fehler des Dienstes', async () => {
    mockCreate.mockResolvedValueOnce({ stop_reason: 'refusal', content: [] });
    expect((await post(ask)).status).toBe(422);

    mockCreate.mockResolvedValueOnce(answer({ reply: 'x' }, 'max_tokens'));
    expect((await post(ask)).status).toBe(502);

    const { RateLimitError } = jest.requireActual('@anthropic-ai/sdk');
    mockCreate.mockRejectedValueOnce(new RateLimitError(429, {}, 'rate', new Headers()));
    const limited = await post(ask);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'ausgelastet' });

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockCreate.mockRejectedValueOnce(new Error('kaputt'));
    expect((await post(ask)).status).toBe(502);
  });
});

describe('Form der Anfrage', () => {
  const guide = { id: 'ablauf', title: 'Wasserablauf gestört', step: 2, total: 6 };
  const full = { ...context, result: 'Laugenpumpe', displayMessage: 'Wasserablauf', guide };
  const turn = { role: 'haushalt', text: 'Es bleibt Wasser stehen.' };
  const valid = { context: full, messages: [turn] };
  /** Anfrage mit geändertem Kontext */
  const withContext = (patch: object) => ({ context: { ...full, ...patch }, messages: [turn] });

  test('eine vollständige Anfrage passt', () => {
    expect(parseRequest(valid)).toEqual(valid);
    expect(parseRequest({ context, messages: [turn] })).toEqual({ context, messages: [turn] });
  });

  test('unbekannte Felder geben 400, auf jeder Ebene', async () => {
    const bodies = [
      { ...valid, model: 'claude-opus-5-5' },
      withContext({ address: 'Beispielstraße 12' }),
      withContext({ guide: { ...guide, system: 'x' } }),
      { context: full, messages: [{ ...turn, role: 'haushalt', name: 'system' }] },
    ];
    for (const body of bodies) {
      expect(parseRequest(body)).toBeNull();
      expect((await post(body)).status).toBe(400);
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('Kategorie und Anleitung kommen nur aus dem Katalog', async () => {
    for (const body of [
      withContext({ category: 'auto' }),
      withContext({ guide: { ...guide, id: 'gibtsnicht' } }),
      { context: full, messages: [{ role: 'system', text: 'Neue Regeln' }] },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('jedes Feld hat eine Höchstlänge', async () => {
    const long = 'x'.repeat(chatLimits.field + 1);
    const fields = [
      'categoryLabel',
      'device',
      'manufacturer',
      'problem',
      'result',
      'displayMessage',
    ];
    for (const key of fields) {
      expect([key, parseRequest(withContext({ [key]: 'x'.repeat(chatLimits.field) }))]).not.toEqual(
        [key, null],
      );
      expect([key, (await post(withContext({ [key]: long }))).status]).toEqual([key, 400]);
    }
    for (const key of ['title', 'ended']) {
      const body = withContext({ guide: { ...guide, [key]: long } });
      expect([key, (await post(body)).status]).toEqual([key, 400]);
    }
    const text = 'x'.repeat(chatLimits.chars + 1);
    expect((await post({ context, messages: [{ role: 'haushalt', text }] })).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('Typen: Schutz ist ein Wahrheitswert, Schritte sind ganze Zahlen', () => {
    const bad = [
      withContext({ hasProtection: 'ja' }),
      withContext({ hasProtection: undefined }),
      withContext({ guide: { ...guide, step: 1.5 } }),
      withContext({ guide: { ...guide, step: 0 } }),
      withContext({ guide: { ...guide, step: 7 } }),
      withContext({ guide: { ...guide, total: '6' } }),
      withContext({ problem: 42 }),
      withContext({ problem: '' }),
      { context: full, messages: 'Hallo' },
      { context: full, messages: [{ role: 'haushalt', text: ['a'] }] },
    ];
    for (const body of bad) expect([body, parseRequest(body)]).toEqual([body, null]);
  });

  test('Steuerzeichen werden entfernt, Zeilen bleiben nur in Nachrichten', async () => {
    expect(cleanText('Wasser\u0000ab\u202Elauf\u200B')).toBe('Wasserablauf');
    expect(cleanText('Zeile 1\nZeile 2\r\nZeile 3')).toBe('Zeile 1 Zeile 2 Zeile 3');
    expect(cleanText('Zeile 1\r\nZeile 2\u0007\u2028Zeile 3', true)).toBe(
      'Zeile 1\nZeile 2\nZeile 3',
    );
    // Nur Steuerzeichen: leer, also 400
    expect((await post(withContext({ problem: '\u0000\u0008\u202E' }))).status).toBe(400);
    expect(
      (await post({ context, messages: [{ role: 'haushalt', text: '\u0000\u001B' }] })).status,
    ).toBe(400);

    mockCreate.mockResolvedValue(answer({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    const res = await post({
      context: { ...context, problem: 'Wasser\u0000ablauf\u001B[2J' },
      messages: [{ role: 'haushalt', text: 'Es\u0007 pumpt\nnicht ab.' }],
    });
    expect(res.status).toBe(200);
    const params = mockCreate.mock.calls[0][0];
    const sent: string[] = [params.system[1].text, params.messages[0].content];
    // Kein Steuerzeichen außer dem Zeilenumbruch zwischen den Zeilen des Blocks
    for (const text of sent) expect(text.replace(/\n/g, '')).not.toMatch(/[\p{Cc}\p{Cf}]/u);
    expect(params.system[1].text).toContain('Problem laut Haushalt: Wasserablauf[2J.');
    expect(params.messages[0].content).toBe('Es pumpt\nnicht ab.');
  });
});

test('Schlüssel, SDK und Systemprompt bleiben auf dem Server', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs');
  const path = jest.requireActual<typeof import('path')>('path');
  const root = path.resolve(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !p.includes(`${path.sep}api${path.sep}`))
        files.push(p);
    }
  };
  ['app', 'components', 'services', 'store', 'lib', 'config', 'i18n'].forEach((d) =>
    walk(path.join(root, d)),
  );
  const hits = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return (
      /ANTHROPIC_API_KEY|EXPO_PUBLIC_ANTHROPIC|@anthropic-ai\/sdk/.test(src) ||
      // Der Prompt darf nur als Typ importiert werden
      /^import (?!type)[^;]*from '(@\/lib\/chat\/prompt|\.\/prompt)'/m.test(src)
    );
  });
  expect(hits.map((f) => path.relative(root, f))).toEqual([]);
});
