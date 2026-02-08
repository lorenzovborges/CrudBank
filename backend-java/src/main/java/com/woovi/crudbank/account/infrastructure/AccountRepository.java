package com.woovi.crudbank.account.infrastructure;

import com.woovi.crudbank.account.domain.AccountDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AccountRepository extends MongoRepository<AccountDocument, String> {
}
