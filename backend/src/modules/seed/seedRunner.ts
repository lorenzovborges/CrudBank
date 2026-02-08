import Decimal from 'decimal.js';
import { type Db } from 'mongodb';
import { decimalToDecimal128 } from '../../shared/utils/decimal';

interface SeedOptions {
  enabled: boolean;
  defaultAccountBalance: string;
}

export async function runSeed(db: Db, options: SeedOptions): Promise<void> {
  if (!options.enabled) {
    return;
  }

  const accounts = db.collection('accounts');
  const count = await accounts.countDocuments();
  if (count > 0) {
    return;
  }

  const balance = new Decimal(options.defaultAccountBalance || '1000.00').toDecimalPlaces(2);
  const now = new Date();

  await accounts.insertMany([
    {
      ownerName: 'Default Account 1',
      document: '00000000001',
      branch: '0001',
      number: '12345-6',
      currency: 'BRL',
      currentBalance: decimalToDecimal128(balance),
      status: 'ACTIVE',
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      ownerName: 'Default Account 2',
      document: '00000000002',
      branch: '0001',
      number: '65432-1',
      currency: 'BRL',
      currentBalance: decimalToDecimal128(balance),
      status: 'ACTIVE',
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}
