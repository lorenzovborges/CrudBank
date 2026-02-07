/**
 * @generated SignedSource<<c3a589873b1c850280379909fd084b60>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TransferFundsInput = {
  amount: any;
  description?: string | null | undefined;
  fromAccountId: string;
  idempotencyKey: string;
  toAccountId: string;
};
export type TransferFundsMutation$variables = {
  input: TransferFundsInput;
};
export type TransferFundsMutation$data = {
  readonly transferFunds: {
    readonly fromAccountBalance: any;
    readonly idempotentReplay: boolean;
    readonly processedAt: any;
    readonly toAccountBalance: any;
    readonly transaction: {
      readonly amount: any;
      readonly createdAt: any;
      readonly currency: string;
      readonly description: string;
      readonly fromAccountId: string;
      readonly id: string;
      readonly idempotencyKey: string;
      readonly toAccountId: string;
    };
  };
};
export type TransferFundsMutation = {
  response: TransferFundsMutation$data;
  variables: TransferFundsMutation$variables;
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
    "concreteType": "TransferFundsPayload",
    "kind": "LinkedField",
    "name": "transferFunds",
    "plural": false,
    "selections": [
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "fromAccountBalance",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "toAccountBalance",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "idempotentReplay",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "processedAt",
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
    "name": "TransferFundsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "TransferFundsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c1d70f7f8dc9d4c1b631eab0bb01b823",
    "id": null,
    "metadata": {},
    "name": "TransferFundsMutation",
    "operationKind": "mutation",
    "text": "mutation TransferFundsMutation(\n  $input: TransferFundsInput!\n) {\n  transferFunds(input: $input) {\n    transaction {\n      id\n      fromAccountId\n      toAccountId\n      amount\n      currency\n      description\n      idempotencyKey\n      createdAt\n    }\n    fromAccountBalance\n    toAccountBalance\n    idempotentReplay\n    processedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "400193547d263520860827b42247c175";

export default node;
