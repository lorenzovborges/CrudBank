package com.woovi.crudbank;

import com.woovi.crudbank.ratelimit.application.LeakyBucketService;
import com.woovi.crudbank.ratelimit.domain.LeakyBucketStateDocument;
import com.woovi.crudbank.ratelimit.infrastructure.LeakyBucketStateRepository;
import com.woovi.crudbank.shared.config.RateLimitProperties;
import com.woovi.crudbank.shared.error.DomainException;
import org.springframework.dao.DuplicateKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeakyBucketServiceTest {

    private LeakyBucketStateRepository repository;
    private LeakyBucketService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(LeakyBucketStateRepository.class);
        service = new LeakyBucketService(repository, new RateLimitProperties(2, 1.0));
    }

    @Test
    void shouldAllowWithinCapacity() {
        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject("subject");
        state.setWaterLevel(0.0);
        state.setLastLeakAt(Instant.now().minusSeconds(10));

        when(repository.findBySubject("subject")).thenReturn(Optional.of(state));
        when(repository.save(any(LeakyBucketStateDocument.class))).thenReturn(state);

        service.assertAllowed("subject");

        verify(repository, times(1)).save(any(LeakyBucketStateDocument.class));
    }

    @Test
    void shouldCreateStateWhenSubjectIsNew() {
        when(repository.findBySubject("subject")).thenReturn(Optional.empty());
        when(repository.save(any(LeakyBucketStateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.assertAllowed("subject");

        verify(repository, times(1)).save(any(LeakyBucketStateDocument.class));
    }

    @Test
    void shouldRejectWhenCapacityExceeded() {
        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject("subject");
        state.setWaterLevel(2.0);
        state.setLastLeakAt(Instant.now());

        when(repository.findBySubject("subject")).thenReturn(Optional.of(state));

        assertThrows(DomainException.class, () -> service.assertAllowed("subject"));
    }

    @Test
    void shouldRetryOnOptimisticLockFailure() {
        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject("subject");
        state.setWaterLevel(0.0);
        state.setLastLeakAt(Instant.now());

        when(repository.findBySubject("subject")).thenReturn(Optional.of(state));
        when(repository.save(any(LeakyBucketStateDocument.class)))
            .thenThrow(new OptimisticLockingFailureException("conflict"))
            .thenReturn(state);

        service.assertAllowed("subject");

        verify(repository, times(2)).save(any(LeakyBucketStateDocument.class));
    }

    @Test
    void shouldRetryWhenConcurrentInsertWins() {
        LeakyBucketStateDocument existing = new LeakyBucketStateDocument();
        existing.setSubject("subject");
        existing.setWaterLevel(0.0);
        existing.setLastLeakAt(Instant.now().minusSeconds(1));

        when(repository.findBySubject("subject"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(existing));
        when(repository.save(any(LeakyBucketStateDocument.class)))
            .thenThrow(new DuplicateKeyException("duplicate"))
            .thenReturn(existing);

        service.assertAllowed("subject");

        verify(repository, times(2)).save(any(LeakyBucketStateDocument.class));
    }

    @Test
    void shouldFailWhenRetriesAreExhausted() {
        LeakyBucketStateDocument state = new LeakyBucketStateDocument();
        state.setSubject("subject");
        state.setWaterLevel(0.0);
        state.setLastLeakAt(Instant.now());

        when(repository.findBySubject("subject")).thenReturn(Optional.of(state));
        when(repository.save(any(LeakyBucketStateDocument.class)))
            .thenThrow(new OptimisticLockingFailureException("conflict"));

        assertThrows(DomainException.class, () -> service.assertAllowed("subject"));
    }
}
