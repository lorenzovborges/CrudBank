import { graphql } from 'relay-runtime'

export const RecentTransactionsQuery = graphql`
  query RecentTransactionsQuery($accountId: ID!) {
    sent: transactionsByAccount(
      accountId: $accountId
      direction: SENT
      first: 10
    ) {
      edges {
        node {
          id
          fromAccountId
          toAccountId
          amount
          currency
          description
          createdAt
        }
      }
    }
    received: transactionsByAccount(
      accountId: $accountId
      direction: RECEIVED
      first: 10
    ) {
      edges {
        node {
          id
          fromAccountId
          toAccountId
          amount
          currency
          description
          createdAt
        }
      }
    }
  }
`
