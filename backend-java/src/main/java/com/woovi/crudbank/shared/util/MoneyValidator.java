package com.woovi.crudbank.shared.util;

import com.woovi.crudbank.shared.error.DomainException;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyValidator {

    private MoneyValidator() {
    }

    public static BigDecimal validatePositiveAmount(BigDecimal amount) {
        return validatePositiveAmount(amount, "amount");
    }

    public static BigDecimal validatePositiveAmount(BigDecimal amount, String fieldName) {
        if (amount == null) {
            throw DomainException.validationField(fieldName, "Amount is required");
        }
        if (amount.scale() > 2) {
            throw DomainException.validationField(fieldName, "Amount must have at most 2 decimal places");
        }
        BigDecimal normalized = amount.setScale(2, RoundingMode.UNNECESSARY);
        if (normalized.signum() <= 0) {
            throw DomainException.validationField(fieldName, "Amount must be greater than zero");
        }
        return normalized;
    }

    public static BigDecimal validateNonNegativeAmount(BigDecimal amount) {
        return validateNonNegativeAmount(amount, "amount");
    }

    public static BigDecimal validateNonNegativeAmount(BigDecimal amount, String fieldName) {
        if (amount == null) {
            throw DomainException.validationField(fieldName, "Amount is required");
        }
        if (amount.scale() > 2) {
            throw DomainException.validationField(fieldName, "Amount must have at most 2 decimal places");
        }
        BigDecimal normalized = amount.setScale(2, RoundingMode.UNNECESSARY);
        if (normalized.signum() < 0) {
            throw DomainException.validationField(fieldName, "Amount must be zero or greater");
        }
        return normalized;
    }
}
