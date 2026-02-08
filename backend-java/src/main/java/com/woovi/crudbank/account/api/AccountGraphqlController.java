package com.woovi.crudbank.account.api;

import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.balance.application.BalanceService;
import graphql.relay.Connection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;

@Controller
public class AccountGraphqlController {

    private final AccountService accountService;
    private final BalanceService balanceService;

    public AccountGraphqlController(AccountService accountService, BalanceService balanceService) {
        this.accountService = accountService;
        this.balanceService = balanceService;
    }

    @MutationMapping
    public AccountView createAccount(@Argument @Valid CreateAccountInput input) {
        return accountService.createAccount(
            input.ownerName(),
            input.document(),
            input.branch(),
            input.number(),
            input.initialBalance()
        );
    }

    @MutationMapping
    public AccountView updateAccount(@Argument @Valid UpdateAccountInput input) {
        return accountService.updateAccount(input.id(), input.ownerName(), input.document());
    }

    @MutationMapping
    public AccountView deactivateAccount(@Argument @Valid DeactivateAccountInput input) {
        return accountService.deactivateAccount(input.id());
    }

    @QueryMapping
    public AccountView account(@Argument @NotBlank String id) {
        return accountService.getByGlobalId(id);
    }

    @QueryMapping
    public Connection<AccountView> accounts(@Argument Integer first, @Argument String after, @Argument String status) {
        return accountService.listAccounts(first, after, status);
    }

    @QueryMapping
    public BigDecimal availableBalance(@Argument @NotBlank String accountId) {
        return balanceService.availableBalance(accountId);
    }

    public record CreateAccountInput(
        @NotBlank @Size(min = 3, max = 120) String ownerName,
        @NotBlank @Size(min = 11, max = 18) String document,
        @NotBlank @Pattern(regexp = "^\\d{4}$") String branch,
        @NotBlank @Pattern(regexp = "^\\d{5,12}(-\\d{1})?$") String number,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal initialBalance
    ) {
    }

    public record UpdateAccountInput(
        @NotBlank String id,
        String ownerName,
        String document
    ) {
    }

    public record DeactivateAccountInput(@NotBlank String id) {
    }
}
