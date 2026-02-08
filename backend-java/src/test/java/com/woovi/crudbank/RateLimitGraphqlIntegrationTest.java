package com.woovi.crudbank;

import com.woovi.crudbank.ratelimit.domain.LeakyBucketStateDocument;
import com.woovi.crudbank.ratelimit.infrastructure.LeakyBucketStateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitGraphqlIntegrationTest extends AbstractGraphqlIntegrationTest {

    @Autowired
    private LeakyBucketStateRepository leakyBucketStateRepository;

    @Test
    void shouldRejectTransferWhenRateLimitExceeded() {
        String accountA = createAccount("Alice", "52998224725", "0001", "71717-1", "1000.00");
        String accountB = createAccount("Bob", "02306078106", "0001", "72727-2", "1000.00");

        String fromAccountId = new com.woovi.crudbank.shared.relay.GlobalIdCodec().decode(accountA).id();

        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject("account:%s:mutation:transferFunds".formatted(fromAccountId));
        state.setWaterLevel(10_000.0);
        state.setLastLeakAt(Instant.now());
        state.setUpdatedAt(Instant.now());
        leakyBucketStateRepository.save(state);

        String mutation = """
            mutation Transfer($input: TransferFundsInput!) {
              transferFunds(input: $input) {
                transaction { id }
              }
            }
            """;

        graphQlTester
            .document(mutation)
            .variable("input", Map.of(
                "fromAccountId", accountA,
                "toAccountId", accountB,
                "amount", "1.00",
                "description", "Rate limited",
                "idempotencyKey", "idem-rate-1"
            ))
            .execute()
            .errors()
            .satisfy(errors -> {
                assertThat(errors).isNotEmpty();
                assertThat(errors.getFirst().getExtensions()).containsEntry("code", "RATE_LIMITED");
            });
    }
}
