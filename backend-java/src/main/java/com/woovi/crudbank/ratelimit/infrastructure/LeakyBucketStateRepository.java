package com.woovi.crudbank.ratelimit.infrastructure;

import com.woovi.crudbank.ratelimit.domain.LeakyBucketStateDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface LeakyBucketStateRepository extends MongoRepository<LeakyBucketStateDocument, String> {
    Optional<LeakyBucketStateDocument> findBySubject(String subject);
}
