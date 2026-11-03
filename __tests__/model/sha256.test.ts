import { createHash } from 'crypto';

import { sha256Hex } from '@/model/sha256';

const node = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('sha256Hex', () => {
  test.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ])('Prüfwert aus FIPS 180-2: %j', (text, hash) => {
    expect(sha256Hex(text)).toBe(hash);
  });

  test.each([
    'Grundlage ist deine Anfrage (Art. 6 Abs. 1 lit. b DSGVO).',
    'Gerät, Fotos, Größe, „Anführungszeichen“ · Mittelpunkt',
    'Zeilen\numbruch und Emoji-freie Zeichen: € ° ²',
    '𝔘𝔫𝔦𝔠𝔬𝔡𝔢 außerhalb der BMP',
    'x'.repeat(55),
    'x'.repeat(56),
    'x'.repeat(64),
    'ä'.repeat(1000),
  ])('gleich wie node:crypto für %j', (text) => {
    expect(sha256Hex(text)).toBe(node(text));
  });

  test('ein einzelnes Surrogat zählt wie U+FFFD, wie bei TextEncoder', () => {
    expect(sha256Hex('a\ud800b')).toBe(node('a�b'));
  });
});
