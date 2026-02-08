import { decodeGlobalId, encodeGlobalId } from '../../src/shared/relay/globalIdCodec';

describe('globalIdCodec', () => {
  it('encodes and decodes global id', () => {
    const encoded = encodeGlobalId('Account', 'abc123');
    const decoded = decodeGlobalId(encoded);

    expect(decoded.type).toBe('Account');
    expect(decoded.id).toBe('abc123');
  });

  it('rejects invalid global id', () => {
    expect(() => decodeGlobalId('invalid$')).toThrow('Invalid global id');
    expect(() => decodeGlobalId('%')).toThrow('Invalid global id');
  });
});
