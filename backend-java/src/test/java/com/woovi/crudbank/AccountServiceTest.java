package com.woovi.crudbank;

import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.account.infrastructure.AccountRepository;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.CursorCodec;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class AccountServiceTest {

    private static final String VALID_CPF_A = "52998224725";
    private static final String VALID_CPF_B = "02306078106";

    private AccountRepository accountRepository;
    private MongoTemplate mongoTemplate;
    private AccountService accountService;
    private GlobalIdCodec globalIdCodec;

    @BeforeEach
    void setUp() {
        accountRepository = Mockito.mock(AccountRepository.class);
        mongoTemplate = Mockito.mock(MongoTemplate.class);
        globalIdCodec = new GlobalIdCodec();
        accountService = new AccountService(accountRepository, mongoTemplate, globalIdCodec, new CursorCodec());
    }

    @Test
    void createAccountShouldValidateRequiredFields() {
        assertThatThrownBy(() -> accountService.createAccount("", VALID_CPF_A, "0001", "10000-1", BigDecimal.ONE))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> accountService.createAccount("Alice", "", "0001", "10000-1", BigDecimal.ONE))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> accountService.createAccount("Alice", VALID_CPF_A, "", "10000-1", BigDecimal.ONE))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> accountService.createAccount("Alice", VALID_CPF_A, "0001", "", BigDecimal.ONE))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void createAccountShouldDefaultToZeroWhenInitialBalanceMissing() {
        when(accountRepository.save(any(AccountDocument.class))).thenAnswer(invocation -> {
            AccountDocument account = invocation.getArgument(0);
            account.setId("acc-1");
            return account;
        });

        var view = accountService.createAccount("Alice", VALID_CPF_A, "0001", "10000-1", null);

        assertThat(view.currentBalance()).isEqualByComparingTo("0.00");
        assertThat(view.currency()).isEqualTo("BRL");
    }

    @Test
    void createAccountShouldHandleDuplicateAccount() {
        when(accountRepository.save(any(AccountDocument.class))).thenThrow(new DuplicateKeyException("duplicate"));

        assertThatThrownBy(() -> accountService.createAccount("Alice", VALID_CPF_A, "0001", "10000-1", BigDecimal.ONE))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void updateAndDeactivateShouldWork() {
        AccountDocument account = buildAccount("acc-1", AccountStatus.ACTIVE, Instant.now());
        when(accountRepository.findById("acc-1")).thenReturn(Optional.of(account));
        when(accountRepository.save(any(AccountDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String globalId = globalIdCodec.encode("Account", "acc-1");
        var updated = accountService.updateAccount(globalId, "New Name", VALID_CPF_B);
        assertThat(updated.ownerName()).isEqualTo("New Name");
        assertThat(updated.document()).isEqualTo(VALID_CPF_B);

        var deactivated = accountService.deactivateAccount(globalId);
        assertThat(deactivated.status()).isEqualTo("INACTIVE");
    }

    @Test
    void updateShouldIgnoreBlankFields() {
        AccountDocument account = buildAccount("acc-1", AccountStatus.ACTIVE, Instant.now());
        when(accountRepository.findById("acc-1")).thenReturn(Optional.of(account));
        when(accountRepository.save(any(AccountDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String globalId = globalIdCodec.encode("Account", "acc-1");
        var updated = accountService.updateAccount(globalId, "   ", null);

        assertThat(updated.ownerName()).isEqualTo("Owner");
        assertThat(updated.document()).isEqualTo(VALID_CPF_A);
    }

    @Test
    void updateShouldRejectInactiveAccount() {
        AccountDocument account = buildAccount("acc-1", AccountStatus.INACTIVE, Instant.now());
        when(accountRepository.findById("acc-1")).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> accountService.updateAccount(globalIdCodec.encode("Account", "acc-1"), "Name", VALID_CPF_B))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void findRawShouldRejectInvalidTypeAndMissingAccount() {
        assertThatThrownBy(() -> accountService.findRawByGlobalId(globalIdCodec.encode("User", "id")))
            .isInstanceOf(DomainException.class);

        when(accountRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> accountService.findRawByGlobalId(globalIdCodec.encode("Account", "missing")))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void getByGlobalIdAndFindByIdShouldCoverPaths() {
        AccountDocument account = buildAccount("acc-1", AccountStatus.ACTIVE, Instant.now());
        when(accountRepository.findById("acc-1")).thenReturn(Optional.of(account));

        var view = accountService.getByGlobalId(globalIdCodec.encode("Account", "acc-1"));
        assertThat(view.id()).isNotBlank();

        when(accountRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> accountService.findById("missing"))
            .isInstanceOf(DomainException.class);
    }

    @Test
    void listAccountsShouldValidateInputsAndSupportPagination() {
        assertThatThrownBy(() -> accountService.listAccounts(0, null, null)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> accountService.listAccounts(101, null, null)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> accountService.listAccounts(10, null, "BROKEN")).isInstanceOf(DomainException.class);

        Instant now = Instant.now();
        List<AccountDocument> docs = List.of(
            buildAccount("a3", AccountStatus.ACTIVE, now.plusSeconds(2)),
            buildAccount("a2", AccountStatus.ACTIVE, now.plusSeconds(1)),
            buildAccount("a1", AccountStatus.ACTIVE, now)
        );
        when(mongoTemplate.find(any(Query.class), eq(AccountDocument.class))).thenReturn(docs);

        var connection = accountService.listAccounts(2, null, "ACTIVE");
        assertThat(connection.getEdges()).hasSize(2);
        assertThat(connection.getPageInfo().isHasNextPage()).isTrue();

        String after = connection.getPageInfo().getEndCursor().getValue();
        when(mongoTemplate.find(any(Query.class), eq(AccountDocument.class))).thenReturn(List.of(buildAccount("a1", AccountStatus.ACTIVE, now)));
        var secondPage = accountService.listAccounts(2, after, null);
        assertThat(secondPage.getEdges()).hasSize(1);
    }

    @Test
    void listAccountsShouldSupportDefaultFirstAndEmptyResult() {
        when(mongoTemplate.find(any(Query.class), eq(AccountDocument.class))).thenReturn(List.of());

        var connection = accountService.listAccounts(null, null, null);

        assertThat(connection.getEdges()).isEmpty();
        assertThat(connection.getPageInfo().getStartCursor()).isNull();
        assertThat(connection.getPageInfo().getEndCursor()).isNull();
        assertThat(connection.getPageInfo().isHasPreviousPage()).isFalse();
        assertThat(connection.getPageInfo().isHasNextPage()).isFalse();
    }

    @Test
    void toViewShouldConvertVersion() {
        AccountDocument account = buildAccount("acc-9", AccountStatus.ACTIVE, Instant.now());
        account.setVersion(5L);
        var view = accountService.toView(account);
        assertThat(view.version()).isEqualTo("5");
    }

    @Test
    void createAccountShouldPersistNormalizedFields() {
        when(accountRepository.save(any(AccountDocument.class))).thenAnswer(invocation -> {
            AccountDocument account = invocation.getArgument(0);
            account.setId("acc-1");
            return account;
        });

        accountService.createAccount(" Alice ", "529.982.247-25", " 0001 ", " 10000-1 ", new BigDecimal("10.00"));

        ArgumentCaptor<AccountDocument> captor = ArgumentCaptor.forClass(AccountDocument.class);
        Mockito.verify(accountRepository).save(captor.capture());

        assertThat(captor.getValue().getOwnerName()).isEqualTo("Alice");
        assertThat(captor.getValue().getDocument()).isEqualTo(VALID_CPF_A);
        assertThat(captor.getValue().getBranch()).isEqualTo("0001");
        assertThat(captor.getValue().getNumber()).isEqualTo("10000-1");
        assertThat(captor.getValue().getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(captor.getValue().getCurrency()).isEqualTo(CurrencyCode.BRL);
    }

    private AccountDocument buildAccount(String id, AccountStatus status, Instant createdAt) {
        AccountDocument account = new AccountDocument();
        account.setId(id);
        account.setOwnerName("Owner");
        account.setDocument(VALID_CPF_A);
        account.setBranch("0001");
        account.setNumber("10000-1");
        account.setCurrency(CurrencyCode.BRL);
        account.setCurrentBalance(new BigDecimal("100.00"));
        account.setStatus(status);
        account.setCreatedAt(createdAt);
        account.setUpdatedAt(createdAt);
        return account;
    }
}
