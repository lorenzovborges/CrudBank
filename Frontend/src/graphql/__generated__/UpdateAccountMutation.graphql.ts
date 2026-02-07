/**
 * @generated SignedSource<<7015dcce66e98e708c725072b9d396ea>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateAccountInput = {
  document?: string | null | undefined;
  id: string;
  ownerName?: string | null | undefined;
};
export type UpdateAccountMutation$variables = {
  input: UpdateAccountInput;
};
export type UpdateAccountMutation$data = {
  readonly updateAccount: {
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
};
export type UpdateAccountMutation = {
  response: UpdateAccountMutation$data;
  variables: UpdateAccountMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Account",
    "kind": "LinkedField",
    "name": "updateAccount",
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "UpdateAccountMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "UpdateAccountMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "f92d00292df311fe5431914c7475c535",
    "id": null,
    "metadata": {},
    "name": "UpdateAccountMutation",
    "operationKind": "mutation",
    "text": "mutation UpdateAccountMutation(\n  $input: UpdateAccountInput!\n) {\n  updateAccount(input: $input) {\n    id\n    ownerName\n    document\n    branch\n    number\n    currency\n    currentBalance\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c87f9a06fb928879fd3ab65fadbb4857";

export default node;
