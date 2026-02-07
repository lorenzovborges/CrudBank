package com.woovi.crudbank.transaction.api;

import com.woovi.crudbank.transaction.application.TransactionService;
import com.woovi.crudbank.transaction.domain.TransactionDirection;
import graphql.relay.Connection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;

@Controller
public class TransactionGraphqlController {

    private final TransactionService transactionService;

    public TransactionGraphqlController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @MutationMapping
    public TransferFundsPayloadView transferFunds(@Argument @Valid TransferFundsInput input) {
        return transactionService.transferFunds(
            input.fromAccountId(),
            input.toAccountId(),
            input.amount(),
            input.description(),
            input.idempotencyKey()
        );
    }

    @QueryMapping
    public TransactionView transaction(@Argument @NotBlank String id) {
        return transactionService.getTransactionByGlobalId(id);
    }

    @QueryMapping
    public Connection<TransactionView> transactionsByAccount(
        @Argument @NotBlank String accountId,
        @Argument @NotNull TransactionDirection direction,
        @Argument Integer first,
        @Argument String after
    ) {
        return transactionService.listTransactionsByAccount(accountId, direction, first, after);
    }

    public record TransferFundsInput(
        @NotBlank String fromAccountId,
        @NotBlank String toAccountId,
        @NotNull @DecimalMin(value = "0.01", inclusive = true) @Digits(integer = 18, fraction = 2) BigDecimal amount,
        @Size(max = 140) String description,
        @NotBlank @Size(max = 128) String idempotencyKey
    ) {
    }
}
