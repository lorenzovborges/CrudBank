package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.util.MoneyValidator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MoneyValidatorTest {

    @Test
    void shouldAcceptPositiveAmountWithTwoDecimals() {
        BigDecimal amount = MoneyValidator.validatePositiveAmount(new BigDecimal("10.50"));
        assertEquals(new BigDecimal("10.50"), amount);
    }

    @Test
    void shouldRejectNullAmount() {
        assertThrows(DomainException.class, () -> MoneyValidator.validatePositiveAmount(null));
    }

    @Test
    void shouldRejectZeroAmount() {
        assertThrows(DomainException.class, () -> MoneyValidator.validatePositiveAmount(new BigDecimal("0.00")));
    }

    @Test
    void shouldRejectNegativeAmount() {
        assertThrows(DomainException.class, () -> MoneyValidator.validatePositiveAmount(new BigDecimal("-1.00")));
    }

    @Test
    void shouldRejectAmountWithMoreThanTwoDecimals() {
        assertThrows(DomainException.class, () -> MoneyValidator.validatePositiveAmount(new BigDecimal("1.001")));
    }
}
