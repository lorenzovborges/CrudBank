import {
  Environment,
  Network,
  RecordSource,
  Store,
} from 'relay-runtime'
import type { FetchFunction } from 'relay-runtime'

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8080/graphql'

const fetchFn: FetchFunction = async (request, variables) => {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  })

  return await response.json()
}

export function createRelayEnvironment(): Environment {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  })
}
