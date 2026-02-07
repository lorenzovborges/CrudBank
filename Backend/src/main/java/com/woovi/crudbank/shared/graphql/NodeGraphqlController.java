package com.woovi.crudbank.shared.graphql;

import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import com.woovi.crudbank.transaction.application.TransactionService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class NodeGraphqlController {

    private final GlobalIdCodec globalIdCodec;
    private final AccountService accountService;
    private final TransactionService transactionService;

    public NodeGraphqlController(
        GlobalIdCodec globalIdCodec,
        AccountService accountService,
        TransactionService transactionService
    ) {
        this.globalIdCodec = globalIdCodec;
        this.accountService = accountService;
        this.transactionService = transactionService;
    }

    @QueryMapping
    public Object node(@Argument String id) {
        GlobalIdCodec.DecodedGlobalId decoded = globalIdCodec.decode(id);
        return switch (decoded.type()) {
            case "Account" -> accountService.toView(accountService.findById(decoded.id()));
            case "Transaction" -> transactionService.getTransactionByGlobalId(id);
            default -> throw DomainException.notFound("Node not found");
        };
    }
}
