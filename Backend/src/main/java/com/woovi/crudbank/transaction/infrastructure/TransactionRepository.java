package com.woovi.crudbank.transaction.infrastructure;

import com.woovi.crudbank.transaction.domain.TransactionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TransactionRepository extends MongoRepository<TransactionDocument, String> {
}
