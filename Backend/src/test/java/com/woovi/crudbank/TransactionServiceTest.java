package com.woovi.crudbank;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.shared.config.IdempotencyProperties;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.CursorCodec;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.transaction.api.TransferFundsPayloadView;
import com.woovi.crudbank.transaction.application.TransactionService;
import com.woovi.crudbank.transaction.domain.IdempotencyRecordDocument;
import com.woovi.crudbank.transaction.domain.TransactionDirection;
import com.woovi.crudbank.transaction.domain.TransactionDocument;
import com.woovi.crudbank.transaction.infrastructure.IdempotencyRecordRepository;
import com.woovi.crudbank.transaction.infrastructure.TransactionRepository;
import com.woovi.crudbank.ratelimit.application.LeakyBucketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TransactionServiceTest {

    private TransactionRepository transactionRepository;
    private IdempotencyRecordRepository idempotencyRecordRepository;
    private AccountService accountService;
    private MongoTemplate mongoTemplate;
    private ObjectMapper objectMapper;
    private LeakyBucketService leakyBucketService;
    private TransactionService transactionService;
    private GlobalIdCodec globalIdCodec;

    @BeforeEach
    void setUp() {
        transactionRepository = Mockito.mock(TransactionRepository.class);
        idempotencyRecordRepository = Mockito.mock(IdempotencyRecordRepository.class);
        accountService = Mockito.mock(AccountService.class);
        mongoTemplate = Mockito.mock(MongoTemplate.class);
        objectMapper = Mockito.mock(ObjectMapper.class);
        leakyBucketService = Mockito.mock(LeakyBucketService.class);
        PlatformTransactionManager transactionManager = Mockito.mock(PlatformTransactionManager.class);
        globalIdCodec = new GlobalIdCodec();

        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(idempotencyRecordRepository.findById(anyString())).thenReturn(Optional.empty());
        when(idempotencyRecordRepository.save(any(IdempotencyRecordDocument.class))).thenAnswer(invocation -> {
            IdempotencyRecordDocument record = invocation.getArgument(0);
            if (record.getId() == null) {
                record.setId("idem-id");
            }
            return record;
        });

        transactionService = new TransactionService(
            transactionRepository,
            idempotencyRecordRepository,
            accountService,
            mongoTemplate,
            globalIdCodec,
            new CursorCodec(),
            objectMapper,
            new IdempotencyProperties(24),
            leakyBucketService,
            transactionManager
        );
    }

    @Test
    void transferShouldValidateIdempotencyAndAccounts() {
        assertThatThrownBy(() -> transactionService.transferFunds("a", "b", new BigDecimal("1.00"), null, ""))
            .isInstanceOf(DomainException.class);

        String same = globalIdCodec.encode("Account", "same");
        AccountDocument account = account("same", AccountStatus.ACTIVE, "10.00");
        when(accountService.findRawByGlobalId(same)).thenReturn(account);

        assertThatThrownBy(() -> transactionService.transferFunds(same, same, new BigDecimal("1.00"), null, "key"))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldValidateDescriptionLengthAndIdempotencySize() {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));

        String tooLongDescription = "x".repeat(141);
        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), tooLongDescription, "idem"))
            .isInstanceOf(DomainException.class);

        String tooLongIdempotency = "k".repeat(129);
        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", tooLongIdempotency))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldReplayExistingIdempotency() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));

        IdempotencyRecordDocument record = new IdempotencyRecordDocument();
        record.setSourceAccountId("from");
        record.setKey("idem");
        record.setRequestHash(hash("from", "to", "10.00", "desc"));
        record.setResponsePayload("json");

        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem")).thenReturn(Optional.of(record));
        when(objectMapper.readValue(eq("json"), eq(TransferFundsPayloadView.class))).thenReturn(samplePayload(false));

        TransferFundsPayloadView replay = transactionService.transferFunds(
            fromGlobal,
            toGlobal,
            new BigDecimal("10.00"),
            "desc",
            "idem");

        assertThat(replay.idempotentReplay()).isTrue();
        verify(mongoTemplate, never()).findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class));
        verify(leakyBucketService, never()).assertAllowed(any());
    }

    @Test
    void transferShouldRejectIdempotencyConflictAndInvalidReplayPayload() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));

        IdempotencyRecordDocument conflict = new IdempotencyRecordDocument();
        conflict.setSourceAccountId("from");
        conflict.setKey("idem");
        conflict.setRequestHash("another-hash");
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem")).thenReturn(Optional.of(conflict));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem")).isInstanceOf(DomainException.class);

        IdempotencyRecordDocument invalidPayload = new IdempotencyRecordDocument();
        invalidPayload.setSourceAccountId("from");
        invalidPayload.setKey("idem2");
        invalidPayload.setRequestHash(hash("from", "to", "10.00", "desc"));
        invalidPayload.setResponsePayload("bad");

        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem2")).thenReturn(Optional.of(invalidPayload));
        when(objectMapper.readValue(eq("bad"), eq(TransferFundsPayloadView.class))).thenThrow(jsonException());

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem2")).isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldHandleDebitAndCreditFailures() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem")).thenReturn(Optional.empty());

        // debit null + source inactive
        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class))).thenReturn(null);
        when(accountService.findById("from")).thenReturn(account("from", AccountStatus.INACTIVE, "100.00"));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), null, "idem")).isInstanceOf(DomainException.class);

        // debit null + source active => insufficient funds
        when(accountService.findById("from")).thenReturn(account("from", AccountStatus.ACTIVE, "1.00"));
        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), null, "idem")).isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldPersistTransactionAndHandleSerializationAndDuplicateKey() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem")).thenReturn(Optional.empty());

        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class)))
            .thenReturn(account("from", AccountStatus.ACTIVE, "90.00"))
            .thenReturn(account("to", AccountStatus.ACTIVE, "110.00"));

        TransactionDocument savedTransaction = new TransactionDocument();
        savedTransaction.setId("tx-1");
        savedTransaction.setFromAccountId("from");
        savedTransaction.setToAccountId("to");
        savedTransaction.setAmount(new BigDecimal("10.00"));
        savedTransaction.setCurrency(CurrencyCode.BRL);
        savedTransaction.setDescription("desc");
        savedTransaction.setIdempotencyKey("idem");
        savedTransaction.setCreatedAt(Instant.now());

        when(transactionRepository.save(any(TransactionDocument.class))).thenReturn(savedTransaction);
        when(objectMapper.writeValueAsString(any(TransferFundsPayloadView.class))).thenReturn("json");
        when(idempotencyRecordRepository.save(any(IdempotencyRecordDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        TransferFundsPayloadView payload = transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem");

        assertThat(payload.idempotentReplay()).isFalse();
        verify(leakyBucketService, times(1)).assertAllowed(any());

        // serialization failure
        when(objectMapper.writeValueAsString(any(TransferFundsPayloadView.class))).thenThrow(jsonException());
        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem-2")).isInstanceOf(DomainException.class);

        // duplicate key should return replay payload from concurrent record
        when(objectMapper.writeValueAsString(any(TransferFundsPayloadView.class))).thenReturn("json2");
        when(idempotencyRecordRepository.save(any(IdempotencyRecordDocument.class)))
            .thenThrow(new DuplicateKeyException("duplicate"));

        IdempotencyRecordDocument concurrent = new IdempotencyRecordDocument();
        concurrent.setSourceAccountId("from");
        concurrent.setKey("idem-3");
        concurrent.setRequestHash(hash("from", "to", "10.00", "desc"));
        concurrent.setResponsePayload("json-replay");
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem-3")).thenReturn(Optional.of(concurrent));
        when(objectMapper.readValue(eq("json-replay"), eq(TransferFundsPayloadView.class))).thenReturn(samplePayload(false));

        TransferFundsPayloadView replay = transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem-3");
        assertThat(replay.idempotentReplay()).isTrue();
    }

    @Test
    void transferShouldFailWhenDuplicateKeyHasNoConcurrentRecord() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem-4"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.empty());

        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class)))
            .thenReturn(account("from", AccountStatus.ACTIVE, "90.00"))
            .thenReturn(account("to", AccountStatus.ACTIVE, "110.00"));

        TransactionDocument savedTransaction = new TransactionDocument();
        savedTransaction.setId("tx-4");
        savedTransaction.setFromAccountId("from");
        savedTransaction.setToAccountId("to");
        savedTransaction.setAmount(new BigDecimal("10.00"));
        savedTransaction.setCurrency(CurrencyCode.BRL);
        savedTransaction.setDescription("desc");
        savedTransaction.setIdempotencyKey("idem-4");
        savedTransaction.setCreatedAt(Instant.now());

        when(transactionRepository.save(any(TransactionDocument.class))).thenReturn(savedTransaction);
        when(objectMapper.writeValueAsString(any(TransferFundsPayloadView.class))).thenReturn("json4");
        when(idempotencyRecordRepository.save(any(IdempotencyRecordDocument.class)))
            .thenThrow(new DuplicateKeyException("duplicate"));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem-4")).isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldCleanupPendingRecordWhenTransactionConflicts() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem-conflict"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.empty());

        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class)))
            .thenReturn(account("from", AccountStatus.ACTIVE, "90.00"))
            .thenReturn(account("to", AccountStatus.ACTIVE, "110.00"));

        when(transactionRepository.save(any(TransactionDocument.class)))
            .thenThrow(new DataIntegrityViolationException("write conflict"));

        IdempotencyRecordDocument pending = new IdempotencyRecordDocument();
        pending.setId("idem-id");
        pending.setRequestHash(hash("from", "to", "10.00", "desc"));
        pending.setResponsePayload(null);
        when(idempotencyRecordRepository.findById("idem-id")).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), "desc", "idem-conflict"))
            .isInstanceOf(DomainException.class);

        verify(idempotencyRecordRepository, times(1)).deleteById("idem-id");
    }

    @Test
    void transferShouldHandleDestinationInactive() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem")).thenReturn(Optional.empty());
        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class)))
            .thenReturn(account("from", AccountStatus.ACTIVE, "90.00"))
            .thenReturn(null);
        when(accountService.findById("to")).thenReturn(account("to", AccountStatus.INACTIVE, "100.00"));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), null, "idem")).isInstanceOf(DomainException.class);
    }

    @Test
    void transferShouldHandleDestinationNotFound() throws Exception {
        String fromGlobal = globalIdCodec.encode("Account", "from");
        String toGlobal = globalIdCodec.encode("Account", "to");

        when(accountService.findRawByGlobalId(fromGlobal)).thenReturn(account("from", AccountStatus.ACTIVE, "100.00"));
        when(accountService.findRawByGlobalId(toGlobal)).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));
        when(idempotencyRecordRepository.findBySourceAccountIdAndKey("from", "idem-not-found")).thenReturn(Optional.empty());
        when(mongoTemplate.findAndModify(any(Query.class), any(), any(), eq(AccountDocument.class)))
            .thenReturn(account("from", AccountStatus.ACTIVE, "90.00"))
            .thenReturn(null);
        when(accountService.findById("to")).thenReturn(account("to", AccountStatus.ACTIVE, "100.00"));

        assertThatThrownBy(() -> transactionService.transferFunds(
            fromGlobal, toGlobal, new BigDecimal("10.00"), null, "idem-not-found")).isInstanceOf(DomainException.class);
    }

    @Test
    void getTransactionAndListShouldCoverEdgeCases() {
        assertThatThrownBy(() -> transactionService.getTransactionByGlobalId(globalIdCodec.encode("Account", "1")))
            .isInstanceOf(DomainException.class);

        when(transactionRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> transactionService.getTransactionByGlobalId(globalIdCodec.encode("Transaction", "missing")))
            .isInstanceOf(DomainException.class);

        TransactionDocument tx = new TransactionDocument();
        tx.setId("tx-1");
        tx.setFromAccountId("from");
        tx.setToAccountId("to");
        tx.setAmount(new BigDecimal("1.00"));
        tx.setCurrency(CurrencyCode.BRL);
        tx.setDescription("desc");
        tx.setIdempotencyKey("key");
        tx.setCreatedAt(Instant.now());
        when(transactionRepository.findById("tx-1")).thenReturn(Optional.of(tx));
        assertThat(transactionService.getTransactionByGlobalId(globalIdCodec.encode("Transaction", "tx-1")).id()).isNotBlank();

        assertThatThrownBy(() -> transactionService.listTransactionsByAccount("acc", TransactionDirection.SENT, 0, null))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> transactionService.listTransactionsByAccount("acc", TransactionDirection.SENT, 101, null))
            .isInstanceOf(DomainException.class);

        when(accountService.decodeAccountId("acc")).thenReturn("from");
        assertThatThrownBy(() -> transactionService.listTransactionsByAccount("acc", TransactionDirection.SENT, 10, "bad-cursor"))
            .isInstanceOf(DomainException.class);

        when(mongoTemplate.find(any(Query.class), eq(TransactionDocument.class))).thenReturn(List.of(tx));
        var sentConnection = transactionService.listTransactionsByAccount("acc", TransactionDirection.SENT, 10, null);
        assertThat(sentConnection.getEdges()).hasSize(1);

        var receivedConnection = transactionService.listTransactionsByAccount("acc", TransactionDirection.RECEIVED, 10, null);
        assertThat(receivedConnection.getEdges()).hasSize(1);
    }

    @Test
    void listTransactionsShouldSupportDefaultLimitAndCursorWithEmptyResult() {
        when(accountService.decodeAccountId("acc")).thenReturn("to");
        String after = new CursorCodec().encode(Instant.now(), "tx-after");
        when(mongoTemplate.find(any(Query.class), eq(TransactionDocument.class))).thenReturn(List.of());

        var connection = transactionService.listTransactionsByAccount("acc", TransactionDirection.RECEIVED, null, after);

        assertThat(connection.getEdges()).isEmpty();
        assertThat(connection.getPageInfo().isHasPreviousPage()).isTrue();
        assertThat(connection.getPageInfo().isHasNextPage()).isFalse();
    }

    private AccountDocument account(String id, AccountStatus status, String balance) {
        AccountDocument account = new AccountDocument();
        account.setId(id);
        account.setStatus(status);
        account.setCurrentBalance(new BigDecimal(balance));
        account.setCurrency(CurrencyCode.BRL);
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(Instant.now());
        return account;
    }

    private String hash(String from, String to, String amount, String description) {
        return com.woovi.crudbank.shared.util.HashUtils.sha256Hex(from + "|" + to + "|" + amount + "|" + description);
    }

    private TransferFundsPayloadView samplePayload(boolean replay) {
        TransactionDocument transactionDocument = new TransactionDocument();
        transactionDocument.setId("tx-1");
        transactionDocument.setFromAccountId("from");
        transactionDocument.setToAccountId("to");
        transactionDocument.setAmount(new BigDecimal("10.00"));
        transactionDocument.setCurrency(CurrencyCode.BRL);
        transactionDocument.setDescription("desc");
        transactionDocument.setIdempotencyKey("idem");
        transactionDocument.setCreatedAt(Instant.now());

        return new TransferFundsPayloadView(
            transactionService.toView(transactionDocument),
            new BigDecimal("90.00"),
            new BigDecimal("110.00"),
            replay,
            OffsetDateTime.now()
        );
    }

    private JsonProcessingException jsonException() {
        return new JsonProcessingException("json error") {
        };
    }
}
