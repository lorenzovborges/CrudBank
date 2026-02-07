/**
 * @generated SignedSource<<f344a2558869c6ad0fb81f8fe29082eb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TransactionDirection = "RECEIVED" | "SENT" | "%future added value";
export type TransactionsByAccountQuery$variables = {
  accountId: string;
  after?: string | null | undefined;
  direction: TransactionDirection;
  first: number;
};
export type TransactionsByAccountQuery$data = {
  readonly transactionsByAccount: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly amount: any;
        readonly createdAt: any;
        readonly currency: string;
        readonly description: string;
        readonly fromAccountId: string;
        readonly id: string;
        readonly idempotencyKey: string;
        readonly toAccountId: string;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type TransactionsByAccountQuery = {
  response: TransactionsByAccountQuery$data;
  variables: TransactionsByAccountQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "accountId"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "after"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "direction"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "accountId",
        "variableName": "accountId"
      },
      {
        "kind": "Variable",
        "name": "after",
        "variableName": "after"
      },
      {
        "kind": "Variable",
        "name": "direction",
        "variableName": "direction"
      },
      {
        "kind": "Variable",
        "name": "first",
        "variableName": "first"
      }
    ],
    "concreteType": "TransactionConnection",
    "kind": "LinkedField",
    "name": "transactionsByAccount",
    "plural": false,
    "selections": [
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
            "kind": "ScalarField",
            "name": "cursor",
            "storageKey": null
          },
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
                "name": "idempotencyKey",
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
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PageInfo",
        "kind": "LinkedField",
        "name": "pageInfo",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasNextPage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endCursor",
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
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "TransactionsByAccountQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Operation",
    "name": "TransactionsByAccountQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "4e5463aec81ccdc3a8e441bd9902ce5e",
    "id": null,
    "metadata": {},
    "name": "TransactionsByAccountQuery",
    "operationKind": "query",
    "text": "query TransactionsByAccountQuery(\n  $accountId: ID!\n  $direction: TransactionDirection!\n  $first: Int!\n  $after: String\n) {\n  transactionsByAccount(accountId: $accountId, direction: $direction, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        fromAccountId\n        toAccountId\n        amount\n        currency\n        description\n        idempotencyKey\n        createdAt\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "68df6477c13e5f3a6d745a7f8aa7b5ce";

export default node;
