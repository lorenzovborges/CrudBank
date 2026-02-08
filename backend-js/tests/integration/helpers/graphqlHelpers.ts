import type supertest from 'supertest';
import { gql } from '../testApp';

export async function createAccount(
  requester: supertest.SuperTest<supertest.Test>,
  ownerName: string,
  document: string,
  branch: string,
  number: string,
  initialBalance: string,
): Promise<string> {
  const mutation = `
    mutation CreateAccount($input: CreateAccountInput!) {
      createAccount(input: $input) { id }
    }
  `;

  const result = await gql(requester, mutation, {
    input: { ownerName, document, branch, number, initialBalance },
  });

  const data = result.data as { createAccount?: { id?: string } } | undefined;
  const id = data?.createAccount?.id;
  if (!id) {
    throw new Error(`Unable to create account: ${JSON.stringify(result)}`);
  }

  return id;
}

export async function transferFunds(
  requester: supertest.SuperTest<supertest.Test>,
  input: {
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    description?: string | null;
    idempotencyKey: string;
  },
): Promise<Record<string, unknown>> {
  const mutation = `
    mutation Transfer($input: TransferFundsInput!) {
      transferFunds(input: $input) {
        transaction { id fromAccountId toAccountId amount description createdAt }
        fromAccountBalance
        toAccountBalance
        idempotentReplay
        processedAt
      }
    }
  `;

  return gql(requester, mutation, { input });
}
