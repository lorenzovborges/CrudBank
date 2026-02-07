import { graphql } from 'relay-runtime'

export const DashboardQuery = graphql`
  query DashboardQuery {
    accounts(first: 50, status: ACTIVE) {
      edges {
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
    }
  }
`
