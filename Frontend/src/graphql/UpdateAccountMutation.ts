import { graphql } from 'relay-runtime'

export const UpdateAccountMutation = graphql`
  mutation UpdateAccountMutation($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
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
