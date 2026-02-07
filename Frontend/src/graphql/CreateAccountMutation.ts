import { graphql } from 'relay-runtime'

export const CreateAccountMutation = graphql`
  mutation CreateAccountMutation($input: CreateAccountInput!) {
    createAccount(input: $input) {
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
