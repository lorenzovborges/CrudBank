package com.woovi.crudbank.transaction.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.ratelimit.application.LeakyBucketService;
import com.woovi.crudbank.shared.config.IdempotencyProperties;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.CursorCodec;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.shared.util.HashUtils;
import com.woovi.crudbank.shared.util.MoneyValidator;
import com.woovi.crudbank.transaction.api.TransactionView;
import com.woovi.crudbank.transaction.api.TransferFundsPayloadView;
import com.woovi.crudbank.transaction.domain.IdempotencyRecordDocument;
import com.woovi.crudbank.transaction.domain.TransactionDirection;
import com.woovi.crudbank.transaction.domain.TransactionDocument;
import com.woovi.crudbank.transaction.infrastructure.IdempotencyRecordRepository;
import com.woovi.crudbank.transaction.infrastructure.TransactionRepository;
import graphql.relay.Connection;
import graphql.relay.ConnectionCursor;
import graphql.relay.DefaultConnection;
import graphql.relay.DefaultConnectionCursor;
import graphql.relay.DefaultEdge;
import graphql.relay.DefaultPageInfo;
import graphql.relay.Edge;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class TransactionService {

    private static final Sort DEFAULT_SORT = Sort.by(
        Sort.Order.desc("createdAt"),
        Sort.Order.desc("id")
    );

    private final TransactionRepository transactionRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final AccountService accountService;
    private final MongoTemplate mongoTemplate;
    private final GlobalIdCodec globalIdCodec;
    private final CursorCodec cursorCodec;
    private final ObjectMapper objectMapper;
    private final IdempotencyProperties idempotencyProperties;
    private final LeakyBucketService leakyBucketService;
    private final TransactionTemplate transactionTemplate;
    private final ConcurrentMap<String, IdempotencyKeyLock> idempotencyLocks = new ConcurrentHashMap<>();

    public TransactionService(
        TransactionRepository transactionRepository,
        IdempotencyRecordRepository idempotencyRecordRepository,
        AccountService accountService,
        MongoTemplate mongoTemplate,
        GlobalIdCodec globalIdCodec,
        CursorCodec cursorCodec,
        ObjectMapper objectMapper,
        IdempotencyProperties idempotencyProperties,
        LeakyBucketService leakyBucketService,
        PlatformTransactionManager transactionManager
    ) {
        this.transactionRepository = transactionRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.accountService = accountService;
        this.mongoTemplate = mongoTemplate;
        this.globalIdCodec = globalIdCodec;
        this.cursorCodec = cursorCodec;
        this.objectMapper = objectMapper;
        this.idempotencyProperties = idempotencyProperties;
        this.leakyBucketService = leakyBucketService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public TransferFundsPayloadView transferFunds(
        String fromAccountGlobalId,
        String toAccountGlobalId,
        BigDecimal amount,
        String description,
        String idempotencyKey
    ) {
        if (!StringUtils.hasText(fromAccountGlobalId)) {
            throw DomainException.validationField("fromAccountId", "Source account is required");
        }
        if (!StringUtils.hasText(toAccountGlobalId)) {
            throw DomainException.validationField("toAccountId", "Destination account is required");
        }

        String normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
        String normalizedDescription = normalizeDescription(description);

        BigDecimal normalizedAmount = MoneyValidator.validatePositiveAmount(amount, "amount");
        AccountDocument fromAccount = accountService.findRawByGlobalId(fromAccountGlobalId);
        AccountDocument toAccount = accountService.findRawByGlobalId(toAccountGlobalId);

        if (fromAccount.getId().equals(toAccount.getId())) {
            throw DomainException.validationField("toAccountId", "Source and destination accounts must be different");
        }

        String requestHash = buildRequestHash(fromAccount.getId(), toAccount.getId(), normalizedAmount, normalizedDescription);
        String lockKey = fromAccount.getId() + ":" + normalizedIdempotencyKey;
        IdempotencyKeyLock lock = acquireIdempotencyLock(lockKey);
        lock.reentrantLock().lock();
        try {
            IdempotencyRecordDocument existingRecord = idempotencyRecordRepository
                .findBySourceAccountIdAndKey(fromAccount.getId(), normalizedIdempotencyKey)
                .orElse(null);

            if (existingRecord != null) {
                return replayOrWait(existingRecord, fromAccount.getId(), normalizedIdempotencyKey, requestHash);
            }

            Instant now = Instant.now();
            IdempotencyRecordDocument record = new IdempotencyRecordDocument();
            record.setSourceAccountId(fromAccount.getId());
            record.setKey(normalizedIdempotencyKey);
            record.setRequestHash(requestHash);
            record.setCreatedAt(now);
            record.setExpiresAt(now.plusSeconds(idempotencyProperties.ttlHours() * 3600L));

            try {
                record = idempotencyRecordRepository.save(record);
            } catch (DataIntegrityViolationException ex) {
                IdempotencyRecordDocument concurrentRecord = idempotencyRecordRepository
                    .findBySourceAccountIdAndKey(fromAccount.getId(), normalizedIdempotencyKey)
                    .orElseThrow(() -> DomainException.conflict("Idempotency conflict"));
                return replayOrWait(concurrentRecord, fromAccount.getId(), normalizedIdempotencyKey, requestHash);
            }

            IdempotencyRecordDocument reservedRecord = record;
            try {
                TransferFundsPayloadView payload = transactionTemplate.execute(status -> executeTransfer(
                    fromAccount.getId(),
                    toAccount.getId(),
                    normalizedAmount,
                    normalizedDescription,
                    normalizedIdempotencyKey,
                    reservedRecord
                ));
                if (payload == null) {
                    throw DomainException.badRequest("Unable to process transfer");
                }
                return payload;
            } catch (DataIntegrityViolationException ex) {
                cleanupPendingRecord(reservedRecord.getId(), requestHash);

                IdempotencyRecordDocument concurrentRecord = idempotencyRecordRepository
                    .findBySourceAccountIdAndKey(fromAccount.getId(), normalizedIdempotencyKey)
                    .orElse(null);
                if (concurrentRecord != null && requestHash.equals(concurrentRecord.getRequestHash())) {
                    return replayOrWait(concurrentRecord, fromAccount.getId(), normalizedIdempotencyKey, requestHash);
                }
                throw DomainException.conflict("Transfer could not be completed due to concurrent update. Retry with the same idempotency key");
            } catch (RuntimeException ex) {
                cleanupPendingRecord(reservedRecord.getId(), requestHash);
                throw ex;
            }
        } finally {
            releaseIdempotencyLock(lockKey, lock);
        }
    }

    public TransactionView getTransactionByGlobalId(String globalId) {
        GlobalIdCodec.DecodedGlobalId decoded = globalIdCodec.decode(globalId);
        if (!"Transaction".equals(decoded.type())) {
            throw DomainException.validation("Expected Transaction global id");
        }
        TransactionDocument transaction = transactionRepository.findById(decoded.id())
            .orElseThrow(() -> DomainException.notFound("Transaction not found"));
        return toView(transaction);
    }

    public Connection<TransactionView> listTransactionsByAccount(
        String accountGlobalId,
        TransactionDirection direction,
        Integer first,
        String afterCursor
    ) {
        int size = first == null ? 20 : first;
        if (size <= 0 || size > 100) {
            throw DomainException.validation("first must be between 1 and 100");
        }

        String accountId = accountService.decodeAccountId(accountGlobalId);

        Query query = new Query();
        query.with(DEFAULT_SORT);
        query.limit(size + 1);

        if (direction == TransactionDirection.SENT) {
            query.addCriteria(Criteria.where("fromAccountId").is(accountId));
        } else {
            query.addCriteria(Criteria.where("toAccountId").is(accountId));
        }

        if (StringUtils.hasText(afterCursor)) {
            CursorCodec.DecodedCursor decodedCursor = cursorCodec.decode(afterCursor);
            Criteria olderDate = Criteria.where("createdAt").lt(decodedCursor.createdAt());
            Criteria sameDateOlderId = new Criteria().andOperator(
                Criteria.where("createdAt").is(decodedCursor.createdAt()),
                Criteria.where("id").lt(decodedCursor.id())
            );
            query.addCriteria(new Criteria().orOperator(olderDate, sameDateOlderId));
        }

        List<TransactionDocument> documents = mongoTemplate.find(query, TransactionDocument.class);
        boolean hasNextPage = documents.size() > size;
        if (hasNextPage) {
            documents = documents.subList(0, size);
        }

        List<Edge<TransactionView>> edges = new ArrayList<>();
        for (TransactionDocument document : documents) {
            String cursor = cursorCodec.encode(document.getCreatedAt(), document.getId());
            edges.add(new DefaultEdge<>(toView(document), new DefaultConnectionCursor(cursor)));
        }

        ConnectionCursor startCursor = edges.isEmpty() ? null : edges.getFirst().getCursor();
        ConnectionCursor endCursor = edges.isEmpty() ? null : edges.getLast().getCursor();
        DefaultPageInfo pageInfo = new DefaultPageInfo(startCursor, endCursor, afterCursor != null, hasNextPage);

        return new DefaultConnection<>(edges, pageInfo);
    }

    public TransactionView toView(TransactionDocument transaction) {
        return new TransactionView(
            globalIdCodec.encode("Transaction", transaction.getId()),
            globalIdCodec.encode("Account", transaction.getFromAccountId()),
            globalIdCodec.encode("Account", transaction.getToAccountId()),
            transaction.getAmount(),
            transaction.getCurrency().name(),
            transaction.getDescription(),
            transaction.getIdempotencyKey(),
            toOffsetDateTime(transaction.getCreatedAt())
        );
    }

    private static OffsetDateTime toOffsetDateTime(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    private AccountDocument debitAccount(String fromAccountId, BigDecimal amount, Instant now) {
        Query debitQuery = new Query(Criteria.where("id").is(fromAccountId)
            .and("status").is(AccountStatus.ACTIVE)
            .and("currentBalance").gte(amount));

        Update debitUpdate = new Update()
            .inc("currentBalance", amount.negate())
            .set("updatedAt", now);

        AccountDocument debited = mongoTemplate.findAndModify(
            debitQuery,
            debitUpdate,
            FindAndModifyOptions.options().returnNew(true),
            AccountDocument.class
        );

        if (debited == null) {
            AccountDocument current = accountService.findById(fromAccountId);
            if (current.getStatus() != AccountStatus.ACTIVE) {
                throw DomainException.accountInactive("Source account is inactive");
            }
            throw DomainException.insufficientFunds("Insufficient funds");
        }

        return debited;
    }

    private AccountDocument creditAccount(String toAccountId, BigDecimal amount, Instant now) {
        Query creditQuery = new Query(Criteria.where("id").is(toAccountId)
            .and("status").is(AccountStatus.ACTIVE));

        Update creditUpdate = new Update()
            .inc("currentBalance", amount)
            .set("updatedAt", now);

        AccountDocument credited = mongoTemplate.findAndModify(
            creditQuery,
            creditUpdate,
            FindAndModifyOptions.options().returnNew(true),
            AccountDocument.class
        );

        if (credited == null) {
            AccountDocument current = accountService.findById(toAccountId);
            if (current.getStatus() != AccountStatus.ACTIVE) {
                throw DomainException.accountInactive("Destination account is inactive");
            }
            throw DomainException.notFound("Destination account not found");
        }

        return credited;
    }

    private String buildRequestHash(String fromAccountId, String toAccountId, BigDecimal amount, String description) {
        return HashUtils.sha256Hex(fromAccountId + "|" + toAccountId + "|" + amount + "|" + description);
    }

    private TransferFundsPayloadView executeTransfer(
        String fromAccountId,
        String toAccountId,
        BigDecimal amount,
        String description,
        String idempotencyKey,
        IdempotencyRecordDocument idempotencyRecord
    ) {
        leakyBucketService.assertAllowed("account:%s:mutation:transferFunds".formatted(fromAccountId));

        Instant now = Instant.now();
        AccountDocument debitedAccount = debitAccount(fromAccountId, amount, now);
        AccountDocument creditedAccount = creditAccount(toAccountId, amount, now);

        TransactionDocument transaction = new TransactionDocument();
        transaction.setFromAccountId(fromAccountId);
        transaction.setToAccountId(toAccountId);
        transaction.setAmount(amount);
        transaction.setCurrency(CurrencyCode.BRL);
        transaction.setDescription(description);
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setCreatedAt(now);

        TransactionDocument savedTransaction = transactionRepository.save(transaction);
        TransferFundsPayloadView payload = new TransferFundsPayloadView(
            toView(savedTransaction),
            debitedAccount.getCurrentBalance(),
            creditedAccount.getCurrentBalance(),
            false,
            toOffsetDateTime(now)
        );

        idempotencyRecord.setResponsePayload(serializePayload(payload));
        idempotencyRecordRepository.save(idempotencyRecord);
        return payload;
    }

    private TransferFundsPayloadView replayOrWait(
        IdempotencyRecordDocument record,
        String sourceAccountId,
        String idempotencyKey,
        String requestHash
    ) {
        if (!requestHash.equals(record.getRequestHash())) {
            throw DomainException.conflict("Idempotency key already used with different payload");
        }

        IdempotencyRecordDocument current = record;
        for (int attempt = 0; attempt < 100; attempt++) {
            if (StringUtils.hasText(current.getResponsePayload())) {
                return buildReplayFromRecord(current, requestHash);
            }

            current = idempotencyRecordRepository
                .findBySourceAccountIdAndKey(sourceAccountId, idempotencyKey)
                .orElseThrow(() -> DomainException.conflict("Idempotency conflict"));

            if (StringUtils.hasText(current.getResponsePayload())) {
                return buildReplayFromRecord(current, requestHash);
            }

            try {
                Thread.sleep(50L);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw DomainException.conflict("Idempotency key is currently being processed");
            }
        }

        throw DomainException.conflict("Idempotency key is currently being processed");
    }

    private void cleanupPendingRecord(String idempotencyRecordId, String requestHash) {
        if (!StringUtils.hasText(idempotencyRecordId)) {
            return;
        }

        idempotencyRecordRepository.findById(idempotencyRecordId).ifPresent(record -> {
            if (requestHash.equals(record.getRequestHash()) && !StringUtils.hasText(record.getResponsePayload())) {
                idempotencyRecordRepository.deleteById(idempotencyRecordId);
            }
        });
    }

    private TransferFundsPayloadView buildReplayFromRecord(IdempotencyRecordDocument record, String requestHash) {
        if (!record.getRequestHash().equals(requestHash)) {
            throw DomainException.conflict("Idempotency key already used with different payload");
        }

        if (!StringUtils.hasText(record.getResponsePayload())) {
            throw DomainException.conflict("Idempotency key is currently being processed");
        }

        try {
            TransferFundsPayloadView original = objectMapper.readValue(record.getResponsePayload(), TransferFundsPayloadView.class);
            return new TransferFundsPayloadView(
                original.transaction(),
                original.fromAccountBalance(),
                original.toAccountBalance(),
                true,
                original.processedAt()
            );
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw DomainException.badRequest("Idempotency replay payload is invalid");
        }
    }

    private String serializePayload(TransferFundsPayloadView payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw DomainException.badRequest("Unable to persist idempotency payload");
        }
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return "";
        }
        String normalized = description.trim();
        if (normalized.length() > 140) {
            throw DomainException.validationField("description", "Description must have at most 140 characters");
        }
        return normalized;
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        if (!StringUtils.hasText(idempotencyKey)) {
            throw DomainException.validationField("idempotencyKey", "Idempotency key is required");
        }
        String normalized = idempotencyKey.trim();
        if (normalized.length() > 128) {
            throw DomainException.validationField("idempotencyKey", "Idempotency key must have at most 128 characters");
        }
        return normalized;
    }

    private IdempotencyKeyLock acquireIdempotencyLock(String lockKey) {
        return idempotencyLocks.compute(lockKey, (ignored, existing) -> {
            IdempotencyKeyLock keyLock = existing == null ? new IdempotencyKeyLock() : existing;
            keyLock.references().incrementAndGet();
            return keyLock;
        });
    }

    private void releaseIdempotencyLock(String lockKey, IdempotencyKeyLock lock) {
        lock.reentrantLock().unlock();
        idempotencyLocks.compute(lockKey, (ignored, current) -> {
            if (current != lock) {
                return current;
            }
            return lock.references().decrementAndGet() == 0 ? null : lock;
        });
    }

    private record IdempotencyKeyLock(
        ReentrantLock reentrantLock,
        AtomicInteger references
    ) {
        private IdempotencyKeyLock() {
            this(new ReentrantLock(), new AtomicInteger(0));
        }
    }
}
