import { graphql } from 'relay-runtime'

export const RecentTransactionsQuery = graphql`
  query RecentTransactionsQuery($accountIds: [ID!]!, $first: Int!) {
    recentTransactions(accountIds: $accountIds, first: $first) {
      type
      transaction {
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
`
