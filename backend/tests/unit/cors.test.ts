import { buildCorsOriginMatcher } from '../../src/config/cors';

describe('cors config', () => {
  it('allows origin by wildcard and exact pattern', () => {
    const matcher = buildCorsOriginMatcher('http://localhost:*,https://app.example.com');

    expect(matcher('http://localhost:5173')).toBe('http://localhost:5173');
    expect(matcher('https://app.example.com')).toBe('https://app.example.com');
  });

  it('returns wildcard for missing origin and false for blocked origin', () => {
    const matcher = buildCorsOriginMatcher('https://allowed.example.com');

    expect(matcher(undefined)).toBe('*');
    expect(matcher('https://blocked.example.com')).toBe(false);
  });

  it('supports literal dots and regex special chars in patterns', () => {
    const matcher = buildCorsOriginMatcher('https://api.example.com,https://foo.bar:*');

    expect(matcher('https://api.example.com')).toBe('https://api.example.com');
    expect(matcher('https://foo.bar:8080')).toBe('https://foo.bar:8080');
    expect(matcher('https://fooXbar:8080')).toBe(false);
  });
});
