package com.woovi.crudbank;

import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.account.infrastructure.AccountRepository;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.error.ErrorCode;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.transaction.api.TransferFundsPayloadView;
import com.woovi.crudbank.transaction.application.TransactionService;
import com.woovi.crudbank.transaction.infrastructure.IdempotencyRecordRepository;
import com.woovi.crudbank.transaction.infrastructure.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyConcurrencyIntegrationTest extends AbstractGraphqlIntegrationTest {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private GlobalIdCodec globalIdCodec;

    @Test
    void shouldReplayDeterministicallyDuringConcurrentRetries() throws Exception {
        AccountDocument from = accountRepository.save(newAccount("Alice", "doc-a", "0001", "11111-1", "1000.00"));
        AccountDocument to = accountRepository.save(newAccount("Bob", "doc-b", "0001", "22222-2", "1000.00"));

        String fromGlobalId = globalIdCodec.encode("Account", from.getId());
        String toGlobalId = globalIdCodec.encode("Account", to.getId());

        int threads = 8;
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(threads);

        List<Callable<Object>> tasks = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            tasks.add(() -> {
                ready.countDown();
                start.await(5, TimeUnit.SECONDS);
                try {
                    return transactionService.transferFunds(
                        fromGlobalId,
                        toGlobalId,
                        new BigDecimal("10.00"),
                        "parallel retry",
                        "idem-concurrent-1"
                    );
                } catch (Throwable throwable) {
                    return throwable;
                }
            });
        }

        List<Future<Object>> futures = new ArrayList<>();
        for (Callable<Object> task : tasks) {
            futures.add(executor.submit(task));
        }

        ready.await(5, TimeUnit.SECONDS);
        start.countDown();

        List<Object> outcomes = new ArrayList<>();
        for (Future<Object> future : futures) {
            outcomes.add(future.get(15, TimeUnit.SECONDS));
        }
        executor.shutdownNow();

        long transientConflicts = outcomes.stream()
            .filter(DomainException.class::isInstance)
            .map(DomainException.class::cast)
            .filter(exception -> exception.getCode() == ErrorCode.CONFLICT)
            .count();

        long unexpectedErrors = outcomes.stream()
            .filter(Throwable.class::isInstance)
            .filter(outcome -> !(outcome instanceof DomainException domainException
                && domainException.getCode() == ErrorCode.CONFLICT))
            .count();
        assertThat(unexpectedErrors).isZero();

        long replays = outcomes.stream()
            .filter(TransferFundsPayloadView.class::isInstance)
            .map(TransferFundsPayloadView.class::cast)
            .filter(TransferFundsPayloadView::idempotentReplay)
            .count();
        long freshExecutions = outcomes.stream()
            .filter(TransferFundsPayloadView.class::isInstance)
            .map(TransferFundsPayloadView.class::cast)
            .filter(payload -> !payload.idempotentReplay())
            .count();

        assertThat(freshExecutions).isEqualTo(1);
        assertThat(replays + transientConflicts).isEqualTo(threads - 1L);
        assertThat(transactionRepository.count()).isEqualTo(1);
        assertThat(idempotencyRecordRepository.count()).isEqualTo(1);
    }

    private AccountDocument newAccount(String ownerName, String document, String branch, String number, String balance) {
        AccountDocument account = new AccountDocument();
        account.setOwnerName(ownerName);
        account.setDocument(document);
        account.setBranch(branch);
        account.setNumber(number);
        account.setCurrency(CurrencyCode.BRL);
        account.setCurrentBalance(new BigDecimal(balance));
        account.setStatus(AccountStatus.ACTIVE);
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(Instant.now());
        return account;
    }
}
