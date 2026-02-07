package com.woovi.crudbank.transaction.infrastructure;

import com.woovi.crudbank.transaction.domain.IdempotencyRecordDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface IdempotencyRecordRepository extends MongoRepository<IdempotencyRecordDocument, String> {
    Optional<IdempotencyRecordDocument> findBySourceAccountIdAndKey(String sourceAccountId, String key);
}
