import { graphql } from 'relay-runtime'

export const TransactionsByAccountQuery = graphql`
  query TransactionsByAccountQuery(
    $accountId: ID!
    $direction: TransactionDirection!
    $first: Int!
    $after: String
  ) {
    transactionsByAccount(
      accountId: $accountId
      direction: $direction
      first: $first
      after: $after
    ) {
      edges {
        cursor
        node {
          id
          fromAccountId
          toAccountId
          amount
          currency
          description
          idempotencyKey
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
