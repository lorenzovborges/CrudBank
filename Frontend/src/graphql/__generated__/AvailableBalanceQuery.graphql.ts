/**
 * @generated SignedSource<<d01a291abf449974f081a8861cfca1e8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AvailableBalanceQuery$variables = {
  accountId: string;
};
export type AvailableBalanceQuery$data = {
  readonly availableBalance: any;
};
export type AvailableBalanceQuery = {
  response: AvailableBalanceQuery$data;
  variables: AvailableBalanceQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "accountId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "accountId",
        "variableName": "accountId"
      }
    ],
    "kind": "ScalarField",
    "name": "availableBalance",
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "AvailableBalanceQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "AvailableBalanceQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "bc1fe6b188934176a2adf8d1d0624e85",
    "id": null,
    "metadata": {},
    "name": "AvailableBalanceQuery",
    "operationKind": "query",
    "text": "query AvailableBalanceQuery(\n  $accountId: ID!\n) {\n  availableBalance(accountId: $accountId)\n}\n"
  }
};
})();

(node as any).hash = "167d785e6d4b7992844886e5c64e0ce3";

export default node;
