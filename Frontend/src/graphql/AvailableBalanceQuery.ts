import { graphql } from 'relay-runtime'

export const AvailableBalanceQuery = graphql`
  query AvailableBalanceQuery($accountId: ID!) {
    availableBalance(accountId: $accountId)
  }
`
