import { graphql } from 'relay-runtime'

export const TransferFundsMutation = graphql`
  mutation TransferFundsMutation($input: TransferFundsInput!) {
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
`
