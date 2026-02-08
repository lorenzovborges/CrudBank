/**
 * @generated SignedSource<<7487740d7399348b3acbf2f231b56166>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RecentTransactionType = "RECEIVED" | "SENT" | "TRANSFER" | "%future added value";
export type RecentTransactionsQuery$variables = {
  accountIds: ReadonlyArray<string>;
  first: number;
};
export type RecentTransactionsQuery$data = {
  readonly recentTransactions: ReadonlyArray<{
    readonly transaction: {
      readonly amount: any;
      readonly createdAt: any;
      readonly currency: string;
      readonly description: string;
      readonly fromAccountId: string;
      readonly id: string;
      readonly toAccountId: string;
    };
    readonly type: RecentTransactionType;
  }>;
};
export type RecentTransactionsQuery = {
  response: RecentTransactionsQuery$data;
  variables: RecentTransactionsQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "accountIds"
  },
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "first"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "accountIds",
        "variableName": "accountIds"
      },
      {
        "kind": "Variable",
        "name": "first",
        "variableName": "first"
      }
    ],
    "concreteType": "RecentTransaction",
    "kind": "LinkedField",
    "name": "recentTransactions",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "Transaction",
        "kind": "LinkedField",
        "name": "transaction",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "fromAccountId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "toAccountId",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "amount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "currency",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "description",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "createdAt",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "RecentTransactionsQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "RecentTransactionsQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2702d6e548b115e26eb06b230c7f8ddd",
    "id": null,
    "metadata": {},
    "name": "RecentTransactionsQuery",
    "operationKind": "query",
    "text": "query RecentTransactionsQuery(\n  $accountIds: [ID!]!\n  $first: Int!\n) {\n  recentTransactions(accountIds: $accountIds, first: $first) {\n    type\n    transaction {\n      id\n      fromAccountId\n      toAccountId\n      amount\n      currency\n      description\n      createdAt\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "3895c8c5c388b5c81e5b60a25f480b42";

export default node;
