package com.woovi.crudbank.ratelimit.application;

import com.woovi.crudbank.ratelimit.domain.LeakyBucketStateDocument;
import com.woovi.crudbank.ratelimit.infrastructure.LeakyBucketStateRepository;
import com.woovi.crudbank.shared.config.RateLimitProperties;
import com.woovi.crudbank.shared.error.DomainException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class LeakyBucketService {

    private final LeakyBucketStateRepository repository;
    private final RateLimitProperties rateLimitProperties;

    public LeakyBucketService(LeakyBucketStateRepository repository, RateLimitProperties rateLimitProperties) {
        this.repository = repository;
        this.rateLimitProperties = rateLimitProperties;
    }

    public void assertAllowed(String subject) {
        final int maxRetries = 5;
        Instant now = Instant.now();

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            LeakyBucketStateDocument state = repository.findBySubject(subject)
                .orElseGet(() -> newState(subject, now));

            double leaked = rateLimitProperties.leakPerSecond() * Math.max(0, Duration.between(state.getLastLeakAt(), now).toMillis()) / 1000.0;
            double currentLevel = Math.max(0.0, state.getWaterLevel() - leaked);
            double nextLevel = currentLevel + 1.0;

            if (nextLevel > rateLimitProperties.capacity()) {
                int retryAfterSeconds = (int) Math.ceil((nextLevel - rateLimitProperties.capacity()) / rateLimitProperties.leakPerSecond());
                throw DomainException.rateLimited("Rate limit exceeded", Math.max(1, retryAfterSeconds));
            }

            state.setWaterLevel(nextLevel);
            state.setLastLeakAt(now);
            state.setUpdatedAt(now);

            try {
                repository.save(state);
                return;
            } catch (OptimisticLockingFailureException ignored) {
                // retry with the latest persisted state
            } catch (DataIntegrityViolationException ignored) {
                // another concurrent request inserted the same subject first
            }
        }

        throw DomainException.badRequest("Rate limiter busy, please retry");
    }

    private LeakyBucketStateDocument newState(String subject, Instant now) {
        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject(subject);
        state.setWaterLevel(0.0);
        state.setLastLeakAt(now);
        state.setUpdatedAt(now);
        return state;
    }
}
