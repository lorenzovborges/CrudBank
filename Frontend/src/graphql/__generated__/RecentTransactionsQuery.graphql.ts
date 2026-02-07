/**
 * @generated SignedSource<<8b93e3815bf472ce373041a5780eac39>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RecentTransactionsQuery$variables = {
  accountId: string;
};
export type RecentTransactionsQuery$data = {
  readonly received: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly amount: any;
        readonly createdAt: any;
        readonly currency: string;
        readonly description: string;
        readonly fromAccountId: string;
        readonly id: string;
        readonly toAccountId: string;
      };
    }>;
  };
  readonly sent: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly amount: any;
        readonly createdAt: any;
        readonly currency: string;
        readonly description: string;
        readonly fromAccountId: string;
        readonly id: string;
        readonly toAccountId: string;
      };
    }>;
  };
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
    "name": "accountId"
  }
],
v1 = {
  "kind": "Variable",
  "name": "accountId",
  "variableName": "accountId"
},
v2 = {
  "kind": "Literal",
  "name": "first",
  "value": 10
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "TransactionEdge",
    "kind": "LinkedField",
    "name": "edges",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Transaction",
        "kind": "LinkedField",
        "name": "node",
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
],
v4 = [
  {
    "alias": "sent",
    "args": [
      (v1/*: any*/),
      {
        "kind": "Literal",
        "name": "direction",
        "value": "SENT"
      },
      (v2/*: any*/)
    ],
    "concreteType": "TransactionConnection",
    "kind": "LinkedField",
    "name": "transactionsByAccount",
    "plural": false,
    "selections": (v3/*: any*/),
    "storageKey": null
  },
  {
    "alias": "received",
    "args": [
      (v1/*: any*/),
      {
        "kind": "Literal",
        "name": "direction",
        "value": "RECEIVED"
      },
      (v2/*: any*/)
    ],
    "concreteType": "TransactionConnection",
    "kind": "LinkedField",
    "name": "transactionsByAccount",
    "plural": false,
    "selections": (v3/*: any*/),
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "RecentTransactionsQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "RecentTransactionsQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "e5196bda46e28f9dd29826ad0cb34d1f",
    "id": null,
    "metadata": {},
    "name": "RecentTransactionsQuery",
    "operationKind": "query",
    "text": "query RecentTransactionsQuery(\n  $accountId: ID!\n) {\n  sent: transactionsByAccount(accountId: $accountId, direction: SENT, first: 10) {\n    edges {\n      node {\n        id\n        fromAccountId\n        toAccountId\n        amount\n        currency\n        description\n        createdAt\n      }\n    }\n  }\n  received: transactionsByAccount(accountId: $accountId, direction: RECEIVED, first: 10) {\n    edges {\n      node {\n        id\n        fromAccountId\n        toAccountId\n        amount\n        currency\n        description\n        createdAt\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "790de82acf6f15b1936d76ecf012b3d5";

export default node;
