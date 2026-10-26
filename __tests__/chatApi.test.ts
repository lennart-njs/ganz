/**
 * @jest-environment node
 */
import { POST } from '@/app/api/chat+api';
import { STABLE_SYSTEM, caseSystem, parseReply, type ChatContext } from '@/lib/chat/prompt';

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
