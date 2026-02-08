import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(process.cwd(), '..');
const JAVA_DIR = path.join(ROOT, 'backend-java');
const JS_DIR = path.join(ROOT, 'backend-js');

const JAVA_URL = 'http://localhost:8080/graphql';
const JAVA_HEALTH_URL = 'http://localhost:8080/actuator/health';
const JS_URL = 'http://localhost:18080/graphql';
const JS_HEALTH_URL = 'http://localhost:18080/health';

function run(cmd, cwd, env = {}) {
  execSync(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

function runQuiet(cmd, cwd, env = {}) {
  try {
    execSync(cmd, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'ignore',
    });
  } catch {
    // ignore cleanup errors
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 180000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health check returned status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(2000);
  }

  throw new Error(`Timed out waiting for health endpoint: ${url}. Last error: ${String(lastError)}`);
}

async function graphql(url, query, variables = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error ${response.status} at ${url}`);
  }

  return response.json();
}

function assertNoErrors(result, label) {
  if (result.errors?.length) {
    throw new Error(`${label} returned GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
}

async function runFlow(url, label) {
  const createAccountMutation = `
    mutation CreateAccount($input: CreateAccountInput!) {
      createAccount(input: $input) {
        id
        ownerName
        document
        branch
        number
        currency
        currentBalance
        status
      }
    }
  `;

  const transferFundsMutation = `
    mutation TransferFunds($input: TransferFundsInput!) {
      transferFunds(input: $input) {
        transaction {
          id
          fromAccountId
          toAccountId
          amount
          currency
          description
          idempotencyKey
          createdAt
        }
        fromAccountBalance
        toAccountBalance
        idempotentReplay
        processedAt
      }
    }
  `;

  const accountAResult = await graphql(url, createAccountMutation, {
    input: {
      ownerName: 'Parity Alice',
      document: '52998224725',
      branch: '0001',
      number: '91000-1',
      initialBalance: '1000.00',
    },
  });
  assertNoErrors(accountAResult, `${label} createAccount A`);

  const accountBResult = await graphql(url, createAccountMutation, {
    input: {
      ownerName: 'Parity Bob',
      document: '02306078106',
      branch: '0001',
      number: '91000-2',
      initialBalance: '500.00',
    },
  });
  assertNoErrors(accountBResult, `${label} createAccount B`);

  const accountAId = accountAResult.data.createAccount.id;
  const accountBId = accountBResult.data.createAccount.id;

  const transferResult = await graphql(url, transferFundsMutation, {
    input: {
      fromAccountId: accountAId,
      toAccountId: accountBId,
      amount: '120.00',
      description: 'Parity transfer',
      idempotencyKey: 'parity-idem-1',
    },
  });
  assertNoErrors(transferResult, `${label} transferFunds`);

  const availableBalanceQuery = `
    query AvailableBalance($accountId: ID!) {
      availableBalance(accountId: $accountId)
    }
  `;

  const balanceAResult = await graphql(url, availableBalanceQuery, { accountId: accountAId });
  assertNoErrors(balanceAResult, `${label} availableBalance A`);

  const balanceBResult = await graphql(url, availableBalanceQuery, { accountId: accountBId });
  assertNoErrors(balanceBResult, `${label} availableBalance B`);

  const accountsQuery = `
    query Accounts($first: Int!, $status: AccountStatus) {
      accounts(first: $first, status: $status) {
        edges {
          node {
            id
            ownerName
            document
            branch
            number
            currency
            currentBalance
            status
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const accountsResult = await graphql(url, accountsQuery, { first: 10, status: 'ACTIVE' });
  assertNoErrors(accountsResult, `${label} accounts`);

  const txByAccountQuery = `
    query TxByAccount($accountId: ID!, $direction: TransactionDirection!, $first: Int!) {
      transactionsByAccount(accountId: $accountId, direction: $direction, first: $first) {
        edges {
          node {
            id
            fromAccountId
            toAccountId
            amount
            currency
            description
            idempotencyKey
            createdAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const txByAccountResult = await graphql(url, txByAccountQuery, {
    accountId: accountAId,
    direction: 'SENT',
    first: 10,
  });
  assertNoErrors(txByAccountResult, `${label} transactionsByAccount`);

  const recentTransactionsQuery = `
    query RecentTransactions($accountIds: [ID!]!, $first: Int!) {
      recentTransactions(accountIds: $accountIds, first: $first) {
        type
        transaction {
          id
          fromAccountId
          toAccountId
          amount
          currency
          description
          idempotencyKey
          createdAt
        }
      }
    }
  `;

  const recentTransactionsResult = await graphql(url, recentTransactionsQuery, {
    accountIds: [accountAId, accountBId],
    first: 10,
  });
  assertNoErrors(recentTransactionsResult, `${label} recentTransactions`);

  const nodeQuery = `
    query Node($id: ID!) {
      node(id: $id) {
        id
        ... on Account {
          ownerName
          document
          branch
          number
          currency
          currentBalance
          status
        }
      }
    }
  `;

  const nodeResult = await graphql(url, nodeQuery, { id: accountAId });
  assertNoErrors(nodeResult, `${label} node`);

  return {
    accountAId,
    accountBId,
    transactionId: transferResult.data.transferFunds.transaction.id,
    transfer: transferResult.data.transferFunds,
    balances: {
      accountA: balanceAResult.data.availableBalance,
      accountB: balanceBResult.data.availableBalance,
    },
    accounts: accountsResult.data.accounts,
    transactionsByAccount: txByAccountResult.data.transactionsByAccount,
    recentTransactions: recentTransactionsResult.data.recentTransactions,
    node: nodeResult.data.node,
  };
}

function normalize(flow) {
  const toMoney = (value) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
      return String(value);
    }
    return numberValue.toFixed(2);
  };

  const accountMap = new Map([
    [flow.accountAId, 'ACCOUNT_A'],
    [flow.accountBId, 'ACCOUNT_B'],
  ]);
  const transactionMap = new Map([[flow.transactionId, 'TX_1']]);

  const normalizeAccountId = (id) => accountMap.get(id) ?? id;
  const normalizeTransactionId = (id) => transactionMap.get(id) ?? id;

  const normalizeTransactionNode = (node) => ({
    id: normalizeTransactionId(node.id),
    fromAccountId: normalizeAccountId(node.fromAccountId),
    toAccountId: normalizeAccountId(node.toAccountId),
    amount: toMoney(node.amount),
    currency: node.currency,
    description: node.description,
    idempotencyKey: node.idempotencyKey,
    createdAt: '<ISO_TIMESTAMP>',
  });

  return {
    transfer: {
      transaction: normalizeTransactionNode(flow.transfer.transaction),
      fromAccountBalance: toMoney(flow.transfer.fromAccountBalance),
      toAccountBalance: toMoney(flow.transfer.toAccountBalance),
      idempotentReplay: flow.transfer.idempotentReplay,
      processedAt: '<ISO_TIMESTAMP>',
    },
    balances: {
      accountA: toMoney(flow.balances.accountA),
      accountB: toMoney(flow.balances.accountB),
    },
    accounts: {
      edges: flow.accounts.edges
        .filter((edge) => edge.node.ownerName.startsWith('Parity '))
        .map((edge) => ({
          node: {
            id: normalizeAccountId(edge.node.id),
            ownerName: edge.node.ownerName,
            document: edge.node.document,
            branch: edge.node.branch,
            number: edge.node.number,
            currency: edge.node.currency,
            currentBalance: toMoney(edge.node.currentBalance),
            status: edge.node.status,
          },
        }))
        .sort((a, b) => a.node.ownerName.localeCompare(b.node.ownerName)),
      pageInfo: {
        hasNextPage: flow.accounts.pageInfo.hasNextPage,
      },
    },
    transactionsByAccount: {
      edges: flow.transactionsByAccount.edges.map((edge) => ({
        node: normalizeTransactionNode(edge.node),
      })),
      pageInfo: {
        hasNextPage: flow.transactionsByAccount.pageInfo.hasNextPage,
      },
    },
    recentTransactions: flow.recentTransactions.map((item) => ({
      type: item.type,
      transaction: normalizeTransactionNode(item.transaction),
    })),
    node: {
      id: normalizeAccountId(flow.node.id),
      ownerName: flow.node.ownerName,
      document: flow.node.document,
      branch: flow.node.branch,
      number: flow.node.number,
      currency: flow.node.currency,
      currentBalance: toMoney(flow.node.currentBalance),
      status: flow.node.status,
    },
  };
}

function assertSchemaParity() {
  const javaSchemaPath = path.join(JAVA_DIR, 'src', 'main', 'resources', 'graphql', 'schema.graphqls');
  const jsSchemaPath = path.join(JS_DIR, 'src', 'graphql', 'schema.graphqls');

  const javaSchema = fs.readFileSync(javaSchemaPath);
  const jsSchema = fs.readFileSync(jsSchemaPath);

  if (Buffer.compare(jsSchema, javaSchema) !== 0) {
    throw new Error('Schema mismatch between backend-java and backend-js');
  }
}

async function main() {
  assertSchemaParity();

  runQuiet('docker compose --env-file .env.example down -v --remove-orphans', JAVA_DIR);
  runQuiet('docker compose --env-file .env.example down -v --remove-orphans', JS_DIR, {
    APP_PORT: '18080',
    MONGO_PORT: '37017',
  });

  try {
    run('docker compose --env-file .env.example up -d --build', JAVA_DIR, {
      APP_PORT: '8080',
      SEED_ENABLED: 'false',
    });

    run('docker compose --env-file .env.example up -d --build', JS_DIR, {
      APP_PORT: '18080',
      MONGO_PORT: '37017',
      SEED_ENABLED: 'false',
    });

    await Promise.all([waitForHealth(JAVA_HEALTH_URL), waitForHealth(JS_HEALTH_URL)]);

    const [javaFlow, jsFlow] = await Promise.all([runFlow(JAVA_URL, 'java'), runFlow(JS_URL, 'js')]);

    const normalizedJava = normalize(javaFlow);
    const normalizedJs = normalize(jsFlow);

    if (JSON.stringify(normalizedJava) !== JSON.stringify(normalizedJs)) {
      throw new Error(
        `Runtime parity mismatch.\nJava=${JSON.stringify(normalizedJava, null, 2)}\nJS=${JSON.stringify(normalizedJs, null, 2)}`,
      );
    }

    console.log('Parity check passed: backend-java and backend-js are semantically equivalent for covered scenarios.');
  } finally {
    runQuiet('docker compose --env-file .env.example down -v --remove-orphans', JAVA_DIR);
    runQuiet('docker compose --env-file .env.example down -v --remove-orphans', JS_DIR, {
      APP_PORT: '18080',
      MONGO_PORT: '37017',
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
