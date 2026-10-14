import { createHash } from 'crypto';

import { sha256Hex } from '../src/sha256';

const node = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

test('matches the published SHA-256 test vectors', () => {
  expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
    .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
});

test('matches Node crypto for every padding length and for non-ASCII text', () => {
  for (let n = 0; n <= 130; n++) {
    const text = 'x'.repeat(n);
    expect(sha256Hex(text)).toBe(node(text));
  }
  for (const text of ['PhilSys:1234567890123456', 'DriversLicense:N0123456789', 'Niño Peñaflor', '日本', '🙂']) {
    expect(sha256Hex(text)).toBe(node(text));
  }
});
