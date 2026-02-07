import { graphql } from 'relay-runtime'

export const DeactivateAccountMutation = graphql`
  mutation DeactivateAccountMutation($input: DeactivateAccountInput!) {
    deactivateAccount(input: $input) {
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
`
