package com.woovi.crudbank;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BankFlowGraphqlIntegrationTest extends AbstractGraphqlIntegrationTest {

    @Test
    void shouldTransferFundsAndUpdateAvailableBalance() {
        String accountA = createAccount("Alice", "52998224725", "0001", "11111-1", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "22222-2", "500.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id amount fromAccountId toAccountId }
                fromAccountBalance
                toAccountBalance
                idempotentReplay
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "100.00",
                "description", "Lunch",
                "idempotencyKey", "idem-flow-1"
            ))
            .execute()
            .path("transferFunds.fromAccountBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("900.00"))
            .path("transferFunds.toAccountBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("600.00"))
            .path("transferFunds.idempotentReplay").entity(Boolean.class).isEqualTo(false);

        String balanceQuery = """
            query Balance($id: ID!) {
              availableBalance(accountId: $id)
            }
            """;

        graphQlTester
            .document(balanceQuery)
            .variable("id", accountA)
            .execute()
            .path("availableBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("900.00"));

        graphQlTester
            .document(balanceQuery)
            .variable("id", accountB)
            .execute()
            .path("availableBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("600.00"));
    }

    @Test
    void shouldReplayIdempotentTransfer() {
        String accountA = createAccount("Alice", "52998224725", "0001", "33333-3", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "44444-4", "500.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
                idempotentReplay
                fromAccountBalance
                toAccountBalance
              }
            }
            """;

        String transactionId = graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "150.00",
                "description", "Dinner",
                "idempotencyKey", "idem-flow-2"
            ))
            .execute()
            .path("transferFunds.transaction.id")
            .entity(String.class)
            .get();

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "150.00",
                "description", "Dinner",
                "idempotencyKey", "idem-flow-2"
            ))
            .execute()
            .path("transferFunds.transaction.id").entity(String.class).isEqualTo(transactionId)
            .path("transferFunds.idempotentReplay").entity(Boolean.class).isEqualTo(true)
            .path("transferFunds.fromAccountBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("850.00"))
            .path("transferFunds.toAccountBalance").entity(BigDecimal.class).satisfies(amount -> assertThat(amount).isEqualByComparingTo("650.00"));
    }

    @Test
    void shouldRejectSameIdempotencyKeyWithDifferentPayload() {
        String accountA = createAccount("Alice", "52998224725", "0001", "55555-5", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "66666-6", "500.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "100.00",
                "description", "Transfer 1",
                "idempotencyKey", "idem-flow-3"
            ))
            .execute();

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "101.00",
                "description", "Transfer changed",
                "idempotencyKey", "idem-flow-3"
            ))
            .execute()
            .errors()
            .satisfy(errors -> {
                assertThat(errors).isNotEmpty();
                assertThat(errors.getFirst().getExtensions()).containsEntry("code", "CONFLICT");
            });
    }

    @Test
    void shouldRejectTransferWithInsufficientFunds() {
        String accountA = createAccount("Alice", "52998224725", "0001", "77777-7", "50.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "88888-8", "10.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "70.00",
                "description", "Too much",
                "idempotencyKey", "idem-flow-4"
            ))
            .execute()
            .errors()
            .satisfy(errors -> {
                assertThat(errors).isNotEmpty();
                assertThat(errors.getFirst().getExtensions()).containsEntry("code", "INSUFFICIENT_FUNDS");
            });
    }

    @Test
    void shouldRejectTransferWhenAccountInactive() {
        String accountA = createAccount("Alice", "52998224725", "0001", "99999-9", "500.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "00000-0", "500.00");

        String deactivateMutation = """
            mutation Deactivate($input: DeactivateAccountInput!) {
              deactivateAccount(input: $input) {
                id
                status
              }
            }
            """;

        graphQlTester
            .document(deactivateMutation)
            .variable("input", Map.of("id", accountB))
            .execute()
            .path("deactivateAccount.status").entity(String.class).isEqualTo("INACTIVE");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "10.00",
                "description", "Should fail",
                "idempotencyKey", "idem-flow-5"
            ))
            .execute()
            .errors()
            .satisfy(errors -> {
                assertThat(errors).isNotEmpty();
                assertThat(errors.getFirst().getExtensions()).containsEntry("code", "ACCOUNT_INACTIVE");
            });
    }

    @Test
    void shouldSupportRelayPaginationAndNodeLookup() {
        createAccount("A1 Name", "52998224725", "0001", "10101-1", "100.00");
        createAccount("A2 Name", "02306078106", "0001", "20202-2", "100.00");
        String account3 = createAccount("A3 Name", "11144477735", "0001", "30303-3", "100.00");

        String accountsQuery = """
            query Accounts($first: Int!, $after: String) {
              accounts(first: $first, after: $after) {
                edges {
                  cursor
                  node { id ownerName }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
            """;

        String endCursor = graphQlTester
            .document(accountsQuery)
            .variable("first", 2)
            .variable("after", null)
            .execute()
            .path("accounts.pageInfo.hasNextPage").entity(Boolean.class).isEqualTo(true)
            .path("accounts.pageInfo.endCursor").entity(String.class).get();

        graphQlTester
            .document(accountsQuery)
            .variable("first", 2)
            .variable("after", endCursor)
            .execute()
            .path("accounts.edges[0].node.ownerName").entity(String.class).isEqualTo("A1 Name");

        String nodeQuery = """
            query Node($id: ID!) {
              node(id: $id) {
                id
                ... on Account {
                  ownerName
                }
              }
            }
            """;

        graphQlTester
            .document(nodeQuery)
            .variable("id", account3)
            .execute()
            .path("node.id").entity(String.class).isEqualTo(account3)
            .path("node.ownerName").entity(String.class).isEqualTo("A3 Name");
    }

    @Test
    void shouldListTransactionsByDirection() {
        String accountA = createAccount("Alice", "52998224725", "0001", "12121-1", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "34343-3", "1000.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "10.00",
                "description", "T1",
                "idempotencyKey", "idem-flow-7"
            ))
            .execute();

        String listQuery = """
            query Tx($accountId: ID!, $direction: TransactionDirection!, $first: Int!) {
              transactionsByAccount(accountId: $accountId, direction: $direction, first: $first) {
                edges {
                  node {
                    fromAccountId
                    toAccountId
                    amount
                  }
                }
              }
            }
            """;

        graphQlTester
            .document(listQuery)
            .variable("accountId", accountA)
            .variable("direction", "SENT")
            .variable("first", 10)
            .execute()
            .path("transactionsByAccount.edges[0].node.fromAccountId").entity(String.class).isEqualTo(accountA)
            .path("transactionsByAccount.edges[0].node.toAccountId").entity(String.class).isEqualTo(accountB);

        graphQlTester
            .document(listQuery)
            .variable("accountId", accountB)
            .variable("direction", "RECEIVED")
            .variable("first", 10)
            .execute()
            .path("transactionsByAccount.edges[0].node.fromAccountId").entity(String.class).isEqualTo(accountA)
            .path("transactionsByAccount.edges[0].node.toAccountId").entity(String.class).isEqualTo(accountB);
    }

    @Test
    void shouldListRecentTransactionsForAccountSet() {
        String accountA = createAccount("Alice", "52998224725", "0001", "13131-1", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "35353-3", "1000.00");

        String transferMutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(transferMutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "10.00",
                "description", "Recent tx",
                "idempotencyKey", "idem-flow-recent-1"
            ))
            .execute();

        String recentQuery = """
            query Recent($accountIds: [ID!]!, $first: Int!) {
              recentTransactions(accountIds: $accountIds, first: $first) {
                type
                transaction {
                  fromAccountId
                  toAccountId
                }
              }
            }
            """;

        graphQlTester
            .document(recentQuery)
            .variable("accountIds", java.util.List.of(accountA, accountB))
            .variable("first", 10)
            .execute()
            .path("recentTransactions[0].type").entity(String.class).isEqualTo("TRANSFER")
            .path("recentTransactions[0].transaction.fromAccountId").entity(String.class).isEqualTo(accountA)
            .path("recentTransactions[0].transaction.toAccountId").entity(String.class).isEqualTo(accountB);
    }

    @Test
    void shouldReturnEmptyRecentTransactionsWhenAccountIdsIsEmpty() {
        String recentQuery = """
            query Recent($accountIds: [ID!]!, $first: Int!) {
              recentTransactions(accountIds: $accountIds, first: $first) {
                type
                transaction {
                  id
                }
              }
            }
            """;

        graphQlTester
            .document(recentQuery)
            .variable("accountIds", java.util.List.of())
            .variable("first", 10)
            .execute()
            .path("recentTransactions")
            .entityList(Object.class)
            .hasSize(0);
    }
}
