function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((segment) => escapeRegExp(segment))
    .join('.*');

  return new RegExp(`^${escaped}$`);
}

export function buildCorsOriginMatcher(allowedOriginsRaw: string): (origin: string | undefined) => string | false {
  const patterns = allowedOriginsRaw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => wildcardToRegex(value));

  return (origin: string | undefined) => {
    if (!origin) {
      return '*';
    }

    if (patterns.some((pattern) => pattern.test(origin))) {
      return origin;
    }

    return false;
  };
}
