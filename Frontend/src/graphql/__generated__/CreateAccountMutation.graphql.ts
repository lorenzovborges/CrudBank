/**
 * @generated SignedSource<<d1a1aa7f7886246b091b7cb8f771d303>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateAccountInput = {
  branch: string;
  document: string;
  initialBalance?: any | null | undefined;
  number: string;
  ownerName: string;
};
export type CreateAccountMutation$variables = {
  input: CreateAccountInput;
};
export type CreateAccountMutation$data = {
  readonly createAccount: {
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
export type CreateAccountMutation = {
  response: CreateAccountMutation$data;
  variables: CreateAccountMutation$variables;
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
    "name": "createAccount",
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
    "name": "CreateAccountMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "CreateAccountMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9fd88e09040d844191dcfaf5d65445b5",
    "id": null,
    "metadata": {},
    "name": "CreateAccountMutation",
    "operationKind": "mutation",
    "text": "mutation CreateAccountMutation(\n  $input: CreateAccountInput!\n) {\n  createAccount(input: $input) {\n    id\n    ownerName\n    document\n    branch\n    number\n    currency\n    currentBalance\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4b1f54b8c9baa54ab6729ee67bd88c60";

export default node;
