package com.woovi.crudbank.shared.util;

import com.woovi.crudbank.shared.error.DomainException;

public final class DocumentValidator {

    private DocumentValidator() {
    }

    public static String normalizeAndValidateBrazilDocument(String rawDocument) {
        if (rawDocument == null || rawDocument.trim().isEmpty()) {
            throw DomainException.validationField("document", "Document is required");
        }

        String normalized = rawDocument.replaceAll("\\D", "");
        if (normalized.length() == 11 && isValidCpf(normalized)) {
            return normalized;
        }
        if (normalized.length() == 14 && isValidCnpj(normalized)) {
            return normalized;
        }

        throw DomainException.validationField("document", "Document must be a valid CPF or CNPJ");
    }

    static boolean isValidCpf(String cpf) {
        if (cpf == null || cpf.length() != 11 || isRepeatedDigits(cpf)) {
            return false;
        }

        int firstDigit = calculateCpfVerifier(cpf, 9);
        int secondDigit = calculateCpfVerifier(cpf, 10);
        return cpf.charAt(9) == (char) ('0' + firstDigit)
            && cpf.charAt(10) == (char) ('0' + secondDigit);
    }

    static boolean isValidCnpj(String cnpj) {
        if (cnpj == null || cnpj.length() != 14 || isRepeatedDigits(cnpj)) {
            return false;
        }

        int firstDigit = calculateCnpjVerifier(cnpj, 12);
        int secondDigit = calculateCnpjVerifier(cnpj, 13);
        return cnpj.charAt(12) == (char) ('0' + firstDigit)
            && cnpj.charAt(13) == (char) ('0' + secondDigit);
    }

    private static int calculateCpfVerifier(String cpf, int length) {
        int sum = 0;
        int weight = length + 1;
        for (int index = 0; index < length; index++) {
            sum += (cpf.charAt(index) - '0') * weight--;
        }

        int remainder = 11 - (sum % 11);
        return remainder >= 10 ? 0 : remainder;
    }

    private static int calculateCnpjVerifier(String cnpj, int length) {
        int[] weights = length == 12
            ? new int[]{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
            : new int[]{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

        int sum = 0;
        for (int index = 0; index < length; index++) {
            sum += (cnpj.charAt(index) - '0') * weights[index];
        }

        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private static boolean isRepeatedDigits(String value) {
        char first = value.charAt(0);
        for (int index = 1; index < value.length(); index++) {
            if (value.charAt(index) != first) {
                return false;
            }
        }
        return true;
    }
}
