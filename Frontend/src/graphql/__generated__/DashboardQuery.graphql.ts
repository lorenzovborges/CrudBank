/**
 * @generated SignedSource<<8e47e8bfc06adaf8d17e8aaed854909b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DashboardQuery$variables = Record<PropertyKey, never>;
export type DashboardQuery$data = {
  readonly accounts: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly branch: string;
        readonly createdAt: any;
        readonly currency: string;
        readonly currentBalance: any;
        readonly document: string;
        readonly id: string;
        readonly number: string;
        readonly ownerName: string;
        readonly status: string;
        readonly updatedAt: any;
      };
    }>;
  };
};
export type DashboardQuery = {
  response: DashboardQuery$data;
  variables: DashboardQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Literal",
        "name": "first",
        "value": 50
      },
      {
        "kind": "Literal",
        "name": "status",
        "value": "ACTIVE"
      }
    ],
    "concreteType": "AccountConnection",
    "kind": "LinkedField",
    "name": "accounts",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AccountEdge",
        "kind": "LinkedField",
        "name": "edges",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "Account",
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
                "name": "ownerName",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "document",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "branch",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "number",
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
                "name": "currentBalance",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "status",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "createdAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "updatedAt",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": "accounts(first:50,status:\"ACTIVE\")"
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "DashboardQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "DashboardQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "d946e192b9990718daf864e217dcac33",
    "id": null,
    "metadata": {},
    "name": "DashboardQuery",
    "operationKind": "query",
    "text": "query DashboardQuery {\n  accounts(first: 50, status: ACTIVE) {\n    edges {\n      node {\n        id\n        ownerName\n        document\n        branch\n        number\n        currency\n        currentBalance\n        status\n        createdAt\n        updatedAt\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "ef660364360fe29575bbc7ae98c24993";

export default node;
