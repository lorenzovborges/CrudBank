import { sha256Hex } from '../../src/shared/utils/hash';

describe('hash utils', () => {
  it('creates deterministic sha256 hex', () => {
    const hashA = sha256Hex('abc');
    const hashB = sha256Hex('abc');

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });
});
