import { decodeCursor, encodeCursor } from '../../src/shared/relay/cursorCodec';

describe('cursorCodec', () => {
  it('encodes and decodes cursor', () => {
    const now = new Date();
    const encoded = encodeCursor(now, 'id-1');
    const decoded = decodeCursor(encoded);

    expect(decoded.id).toBe('id-1');
    expect(decoded.createdAt.getTime()).toBe(now.getTime());
  });

  it('rejects malformed cursor', () => {
    expect(() => decodeCursor('invalid')).toThrow('Invalid cursor');
    const invalidTimestamp = Buffer.from('nan:id-1', 'utf8').toString('base64url');
    expect(() => decodeCursor(invalidTimestamp)).toThrow('Invalid cursor format');
    expect(() => decodeCursor('%')).toThrow('Invalid cursor');
  });
});
