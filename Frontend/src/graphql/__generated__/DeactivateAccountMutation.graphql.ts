/**
 * @generated SignedSource<<744ed71c0bc66177913bd916eb79d553>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeactivateAccountInput = {
  id: string;
};
export type DeactivateAccountMutation$variables = {
  input: DeactivateAccountInput;
};
export type DeactivateAccountMutation$data = {
  readonly deactivateAccount: {
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
export type DeactivateAccountMutation = {
  response: DeactivateAccountMutation$data;
  variables: DeactivateAccountMutation$variables;
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
    "name": "deactivateAccount",
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
    "name": "DeactivateAccountMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "DeactivateAccountMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "265efd592c9f66aaff9751014c394f57",
    "id": null,
    "metadata": {},
    "name": "DeactivateAccountMutation",
    "operationKind": "mutation",
    "text": "mutation DeactivateAccountMutation(\n  $input: DeactivateAccountInput!\n) {\n  deactivateAccount(input: $input) {\n    id\n    ownerName\n    document\n    branch\n    number\n    currency\n    currentBalance\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "04f1606c6e1f05549861c88e36844c55";

export default node;
