package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.util.AccountFieldNormalizer;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccountFieldNormalizerTest {

    @Test
    void shouldNormalizeValidFields() {
        assertThat(AccountFieldNormalizer.normalizeOwnerName("  Alice   Silva  "))
            .isEqualTo("Alice Silva");
        assertThat(AccountFieldNormalizer.normalizeBranch("00-01"))
            .isEqualTo("0001");
        assertThat(AccountFieldNormalizer.normalizeAccountNumber(" 12345-6 "))
            .isEqualTo("12345-6");
    }

    @Test
    void shouldRejectInvalidFields() {
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeOwnerName("  "))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeOwnerName("Al"))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeOwnerName("A".repeat(121)))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeBranch("12"))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeBranch(null))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeAccountNumber("abcd"))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> AccountFieldNormalizer.normalizeAccountNumber(null))
            .isInstanceOf(DomainException.class);
    }
}
