package com.woovi.crudbank.account.application;

import com.woovi.crudbank.account.api.AccountView;
import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.account.infrastructure.AccountRepository;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.CursorCodec;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.shared.util.AccountFieldNormalizer;
import graphql.relay.Connection;
import graphql.relay.ConnectionCursor;
import graphql.relay.DefaultConnection;
import graphql.relay.DefaultConnectionCursor;
import graphql.relay.DefaultEdge;
import graphql.relay.DefaultPageInfo;
import graphql.relay.Edge;
import com.woovi.crudbank.shared.util.MoneyValidator;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class AccountService {

    private static final Sort DEFAULT_SORT = Sort.by(
        Sort.Order.desc("createdAt"),
        Sort.Order.desc("id")
    );

    private final AccountRepository accountRepository;
    private final MongoTemplate mongoTemplate;
    private final GlobalIdCodec globalIdCodec;
    private final CursorCodec cursorCodec;

    public AccountService(
        AccountRepository accountRepository,
        MongoTemplate mongoTemplate,
        GlobalIdCodec globalIdCodec,
        CursorCodec cursorCodec
    ) {
        this.accountRepository = accountRepository;
        this.mongoTemplate = mongoTemplate;
        this.globalIdCodec = globalIdCodec;
        this.cursorCodec = cursorCodec;
    }

    public AccountView createAccount(String ownerName, String document, String branch, String number, BigDecimal initialBalance) {
        String normalizedOwnerName = AccountFieldNormalizer.normalizeOwnerName(ownerName);
        String normalizedDocument = AccountFieldNormalizer.normalizeDocument(document);
        String normalizedBranch = AccountFieldNormalizer.normalizeBranch(branch);
        String normalizedNumber = AccountFieldNormalizer.normalizeAccountNumber(number);

        BigDecimal normalizedBalance = initialBalance == null
            ? BigDecimal.ZERO.setScale(2)
            : MoneyValidator.validateNonNegativeAmount(initialBalance, "initialBalance");

        AccountDocument account = new AccountDocument();
        account.setOwnerName(normalizedOwnerName);
        account.setDocument(normalizedDocument);
        account.setBranch(normalizedBranch);
        account.setNumber(normalizedNumber);
        account.setCurrency(CurrencyCode.BRL);
        account.setCurrentBalance(normalizedBalance);
        account.setStatus(AccountStatus.ACTIVE);
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(account.getCreatedAt());

        try {
            return toView(accountRepository.save(account));
        } catch (DuplicateKeyException ex) {
            throw DomainException.conflict("An account with same branch and number already exists");
        }
    }

    public AccountView updateAccount(String globalId, String ownerName, String document) {
        AccountDocument account = findByGlobalId(globalId);
        ensureAccountActive(account);

        if (StringUtils.hasText(ownerName)) {
            account.setOwnerName(AccountFieldNormalizer.normalizeOwnerName(ownerName));
        }
        if (StringUtils.hasText(document)) {
            account.setDocument(AccountFieldNormalizer.normalizeDocument(document));
        }

        account.setUpdatedAt(Instant.now());
        return toView(accountRepository.save(account));
    }

    public AccountView deactivateAccount(String globalId) {
        AccountDocument account = findByGlobalId(globalId);
        account.setStatus(AccountStatus.INACTIVE);
        account.setUpdatedAt(Instant.now());
        return toView(accountRepository.save(account));
    }

    public AccountDocument findRawByGlobalId(String globalId) {
        GlobalIdCodec.DecodedGlobalId decoded = globalIdCodec.decode(globalId);
        if (!"Account".equals(decoded.type())) {
            throw DomainException.validation("Expected Account global id");
        }
        return accountRepository.findById(decoded.id())
            .orElseThrow(() -> DomainException.notFound("Account not found"));
    }

    public String decodeAccountId(String globalId) {
        return findRawByGlobalId(globalId).getId();
    }

    public AccountDocument findById(String accountId) {
        return accountRepository.findById(accountId)
            .orElseThrow(() -> DomainException.notFound("Account not found"));
    }

    public AccountView getByGlobalId(String globalId) {
        return toView(findByGlobalId(globalId));
    }

    public Connection<AccountView> listAccounts(Integer first, String afterCursor, String statusFilter) {
        int size = first == null ? 20 : first;
        if (size <= 0 || size > 100) {
            throw DomainException.validation("first must be between 1 and 100");
        }

        Query query = new Query();
        query.with(DEFAULT_SORT);
        query.limit(size + 1);

        if (StringUtils.hasText(statusFilter)) {
            query.addCriteria(Criteria.where("status").is(parseStatus(statusFilter)));
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

        List<AccountDocument> documents = mongoTemplate.find(query, AccountDocument.class);
        boolean hasNextPage = documents.size() > size;
        if (hasNextPage) {
            documents = documents.subList(0, size);
        }

        List<Edge<AccountView>> edges = new ArrayList<>();
        for (AccountDocument document : documents) {
            String cursor = cursorCodec.encode(document.getCreatedAt(), document.getId());
            edges.add(new DefaultEdge<>(toView(document), new DefaultConnectionCursor(cursor)));
        }

        ConnectionCursor startCursor = edges.isEmpty() ? null : edges.getFirst().getCursor();
        ConnectionCursor endCursor = edges.isEmpty() ? null : edges.getLast().getCursor();
        DefaultPageInfo pageInfo = new DefaultPageInfo(startCursor, endCursor, afterCursor != null, hasNextPage);

        return new DefaultConnection<>(edges, pageInfo);
    }

    public AccountView toView(AccountDocument account) {
        return new AccountView(
            globalIdCodec.encode("Account", account.getId()),
            account.getOwnerName(),
            account.getDocument(),
            account.getBranch(),
            account.getNumber(),
            account.getCurrency().name(),
            account.getCurrentBalance(),
            account.getStatus().name(),
            account.getVersion() == null ? null : String.valueOf(account.getVersion()),
            toOffsetDateTime(account.getCreatedAt()),
            toOffsetDateTime(account.getUpdatedAt())
        );
    }

    private static OffsetDateTime toOffsetDateTime(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    public void ensureAccountActive(AccountDocument account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw DomainException.accountInactive("Account is inactive");
        }
    }

    private AccountStatus parseStatus(String status) {
        try {
            return AccountStatus.valueOf(status);
        } catch (IllegalArgumentException ex) {
            throw DomainException.validation("Invalid account status");
        }
    }

    private AccountDocument findByGlobalId(String globalId) {
        return findRawByGlobalId(globalId);
    }
}
