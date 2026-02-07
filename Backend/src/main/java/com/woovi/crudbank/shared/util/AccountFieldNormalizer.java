package com.woovi.crudbank.shared.util;

import com.woovi.crudbank.shared.error.DomainException;

import java.util.regex.Pattern;

public final class AccountFieldNormalizer {

    private static final Pattern ACCOUNT_NUMBER_PATTERN = Pattern.compile("^\\d{5,12}(-\\d{1})?$");

    private AccountFieldNormalizer() {
    }

    public static String normalizeOwnerName(String ownerName) {
        if (ownerName == null || ownerName.trim().isEmpty()) {
            throw DomainException.validationField("ownerName", "Owner name is required");
        }

        String normalized = ownerName.trim().replaceAll("\\s+", " ");
        if (normalized.length() < 3 || normalized.length() > 120) {
            throw DomainException.validationField("ownerName", "Owner name must be between 3 and 120 characters");
        }

        return normalized;
    }

    public static String normalizeDocument(String document) {
        return DocumentValidator.normalizeAndValidateBrazilDocument(document);
    }

    public static String normalizeBranch(String branch) {
        if (branch == null || branch.trim().isEmpty()) {
            throw DomainException.validationField("branch", "Branch is required");
        }

        String normalized = branch.replaceAll("\\D", "");
        if (normalized.length() != 4) {
            throw DomainException.validationField("branch", "Branch must contain exactly 4 digits");
        }

        return normalized;
    }

    public static String normalizeAccountNumber(String number) {
        if (number == null || number.trim().isEmpty()) {
            throw DomainException.validationField("number", "Account number is required");
        }

        String normalized = number.trim().replaceAll("\\s+", "");
        if (!ACCOUNT_NUMBER_PATTERN.matcher(normalized).matches()) {
            throw DomainException.validationField("number", "Account number must match 12345 or 12345-6 pattern");
        }

        return normalized;
    }
}
