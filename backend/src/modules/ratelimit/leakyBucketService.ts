import {
  type ClientSession,
  type Collection,
  type Db,
  type Document,
  type WithId,
} from 'mongodb';
import { DomainError } from '../../shared/errors/DomainError';

interface LeakyBucketStateDocument extends Document {
  subject: string;
  waterLevel: number;
  lastLeakAt: Date;
  updatedAt: Date;
  version: number;
}

interface LeakyBucketOptions {
  capacity: number;
  leakPerSecond: number;
}

function collection(db: Db): Collection<LeakyBucketStateDocument> {
  return db.collection<LeakyBucketStateDocument>('leaky_bucket_state');
}

export class LeakyBucketService {
  private readonly db: Db;
  private readonly options: LeakyBucketOptions;

  constructor(db: Db, options: LeakyBucketOptions) {
    this.db = db;
    this.options = options;
  }

  async assertAllowed(subject: string, session?: ClientSession): Promise<void> {
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const now = new Date();
      const state = await collection(this.db).findOne({ subject }, { session });

      if (!state) {
        const inserted = await this.tryInsertState(subject, now, session);
        if (inserted) {
          return;
        }
        continue;
      }

      const leaked =
        this.options.leakPerSecond *
        Math.max(0, now.getTime() - state.lastLeakAt.getTime()) /
        1000;
      const currentLevel = Math.max(0, state.waterLevel - leaked);
      const nextLevel = currentLevel + 1;

      if (nextLevel > this.options.capacity) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((nextLevel - this.options.capacity) / this.options.leakPerSecond),
        );
        throw DomainError.rateLimited('Rate limit exceeded', retryAfterSeconds);
      }

      const updated = await this.tryUpdateState(state, nextLevel, now, session);
      if (updated) {
        return;
      }
    }

    throw DomainError.badRequest('Rate limiter busy, please retry');
  }

  private async tryInsertState(subject: string, now: Date, session?: ClientSession): Promise<boolean> {
    try {
      await collection(this.db).insertOne(
        {
          subject,
          waterLevel: 1,
          lastLeakAt: now,
          updatedAt: now,
          version: 0,
        },
        { session },
      );
      return true;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async tryUpdateState(
    state: WithId<LeakyBucketStateDocument>,
    nextLevel: number,
    now: Date,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await collection(this.db).updateOne(
      {
        _id: state._id,
        version: state.version,
      },
      {
        $set: {
          waterLevel: nextLevel,
          lastLeakAt: now,
          updatedAt: now,
        },
        $inc: {
          version: 1,
        },
      },
      { session },
    );

    return result.modifiedCount === 1;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: number };
  return maybeError.code === 11000;
}
