import { DomainError } from '../errors/DomainError';

export interface DecodedGlobalId {
  type: string;
  id: string;
}

export function encodeGlobalId(type: string, id: string): string {
  return Buffer.from(`${type}:${id}`, 'utf8').toString('base64url');
}

export function decodeGlobalId(globalId: string): DecodedGlobalId {
  try {
    const decoded = Buffer.from(globalId, 'base64url').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator <= 0 || separator === decoded.length - 1) {
      throw DomainError.validation('Invalid global id format');
    }

    return {
      type: decoded.slice(0, separator),
      id: decoded.slice(separator + 1),
    };
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw DomainError.validation('Invalid global id encoding');
  }
}
