package com.woovi.crudbank;

import com.woovi.crudbank.account.api.AccountView;
import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.graphql.NodeGraphqlController;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.transaction.api.TransactionView;
import com.woovi.crudbank.transaction.application.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class NodeGraphqlControllerTest {

    private AccountService accountService;
    private TransactionService transactionService;
    private GlobalIdCodec globalIdCodec;
    private NodeGraphqlController controller;

    @BeforeEach
    void setUp() {
        accountService = Mockito.mock(AccountService.class);
        transactionService = Mockito.mock(TransactionService.class);
        globalIdCodec = new GlobalIdCodec();
        controller = new NodeGraphqlController(globalIdCodec, accountService, transactionService);
    }

    @Test
    void shouldResolveAccountNode() {
        AccountDocument account = new AccountDocument();
        account.setId("acc-1");
        account.setOwnerName("Owner");
        account.setDocument("52998224725");
        account.setBranch("0001");
        account.setNumber("10000-1");
        account.setCurrency(CurrencyCode.BRL);
        account.setCurrentBalance(new BigDecimal("10.00"));
        account.setStatus(AccountStatus.ACTIVE);
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(Instant.now());

        when(accountService.findById("acc-1")).thenReturn(account);
        when(accountService.toView(any(AccountDocument.class))).thenReturn(new AccountView(
            "global-id",
            "Owner",
            "52998224725",
            "0001",
            "10000-1",
            "BRL",
            new BigDecimal("10.00"),
            "ACTIVE",
            "1",
            OffsetDateTime.now(),
            OffsetDateTime.now()
        ));

        Object result = controller.node(globalIdCodec.encode("Account", "acc-1"));
        assertThat(result).isNotNull();
    }

    @Test
    void shouldResolveTransactionNode() {
        TransactionView view = new TransactionView("id", "from", "to", new BigDecimal("1.00"), "BRL", "desc", "key", OffsetDateTime.now());
        when(transactionService.getTransactionByGlobalId(any())).thenReturn(view);

        Object result = controller.node(globalIdCodec.encode("Transaction", "tx-1"));
        assertThat(result).isEqualTo(view);
    }

    @Test
    void shouldRejectUnknownNodeType() {
        assertThatThrownBy(() -> controller.node(globalIdCodec.encode("Unknown", "id")))
            .isInstanceOf(DomainException.class);
    }
}
