import { DomainError } from '../errors/DomainError';

export interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}:${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator <= 0 || separator === decoded.length - 1) {
      throw DomainError.validation('Invalid cursor format');
    }

    const timestamp = Number(decoded.slice(0, separator));
    const id = decoded.slice(separator + 1);

    if (!Number.isFinite(timestamp)) {
      throw DomainError.validation('Invalid cursor format');
    }

    return {
      createdAt: new Date(timestamp),
      id,
    };
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw DomainError.validation('Invalid cursor encoding');
  }
}
