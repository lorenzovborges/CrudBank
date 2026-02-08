package com.woovi.crudbank.balance.application;

import com.woovi.crudbank.account.application.AccountService;
import com.woovi.crudbank.account.domain.AccountDocument;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class BalanceService {

    private final AccountService accountService;

    public BalanceService(AccountService accountService) {
        this.accountService = accountService;
    }

    public BigDecimal availableBalance(String accountGlobalId) {
        AccountDocument account = accountService.findRawByGlobalId(accountGlobalId);
        return account.getCurrentBalance();
    }
}
