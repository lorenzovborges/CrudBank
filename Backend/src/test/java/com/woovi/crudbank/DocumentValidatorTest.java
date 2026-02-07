package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.util.DocumentValidator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentValidatorTest {

    @Test
    void shouldNormalizeAndValidateCpfAndCnpj() {
        assertThat(DocumentValidator.normalizeAndValidateBrazilDocument("529.982.247-25"))
            .isEqualTo("52998224725");
        assertThat(DocumentValidator.normalizeAndValidateBrazilDocument("91927500967704"))
            .isEqualTo("91927500967704");
    }

    @Test
    void shouldRejectInvalidDocument() {
        assertThatThrownBy(() -> DocumentValidator.normalizeAndValidateBrazilDocument("123"))
            .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> DocumentValidator.normalizeAndValidateBrazilDocument("00000000000"))
            .isInstanceOf(DomainException.class);
    }
}
