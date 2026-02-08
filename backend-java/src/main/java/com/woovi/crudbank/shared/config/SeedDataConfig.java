package com.woovi.crudbank.shared.config;

import com.woovi.crudbank.account.domain.AccountDocument;
import com.woovi.crudbank.account.domain.AccountStatus;
import com.woovi.crudbank.account.domain.CurrencyCode;
import com.woovi.crudbank.account.infrastructure.AccountRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.Instant;

@Configuration
public class SeedDataConfig {

    @Bean
    ApplicationRunner seedDataRunner(
        SeedProperties seedProperties,
        AccountRepository accountRepository
    ) {
        return args -> {
            if (!seedProperties.enabled()) {
                return;
            }

            if (accountRepository.count() == 0) {
                BigDecimal balance = seedProperties.defaultAccountBalance() == null
                    ? BigDecimal.valueOf(1000).setScale(2)
                    : seedProperties.defaultAccountBalance().setScale(2);

                accountRepository.save(createAccount("Default Account 1", "00000000001", "0001", "12345-6", balance));
                accountRepository.save(createAccount("Default Account 2", "00000000002", "0001", "65432-1", balance));
            }
        };
    }

    private AccountDocument createAccount(String ownerName, String document, String branch, String number, BigDecimal balance) {
        AccountDocument account = new AccountDocument();
        account.setOwnerName(ownerName);
        account.setDocument(document);
        account.setBranch(branch);
        account.setNumber(number);
        account.setCurrency(CurrencyCode.BRL);
        account.setCurrentBalance(balance);
        account.setStatus(AccountStatus.ACTIVE);
        account.setCreatedAt(Instant.now());
        account.setUpdatedAt(account.getCreatedAt());
        return account;
    }
}
