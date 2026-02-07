import { graphql } from 'relay-runtime'

export const AccountsQuery = graphql`
  query AccountsQuery($first: Int!, $after: String) {
    accounts(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          ownerName
          document
          branch
          number
          currency
          currentBalance
          status
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
