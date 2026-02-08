package com.woovi.crudbank.shared.error;

import java.util.Map;
import java.util.List;

public class DomainException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> details;

    public DomainException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public DomainException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details;
    }

    public ErrorCode getCode() {
        return code;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public static DomainException notFound(String message) {
        return new DomainException(ErrorCode.NOT_FOUND, message);
    }

    public static DomainException validation(String message) {
        return new DomainException(ErrorCode.VALIDATION_ERROR, message);
    }

    public static DomainException validation(String message, Map<String, Object> details) {
        return new DomainException(ErrorCode.VALIDATION_ERROR, message, details);
    }

    public static DomainException validationField(String field, String message) {
        return validation(
            message,
            Map.of("violations", List.of(Map.of("field", field, "message", message)))
        );
    }

    public static DomainException badRequest(String message) {
        return new DomainException(ErrorCode.BAD_REQUEST, message);
    }

    public static DomainException conflict(String message) {
        return new DomainException(ErrorCode.CONFLICT, message);
    }

    public static DomainException insufficientFunds(String message) {
        return new DomainException(ErrorCode.INSUFFICIENT_FUNDS, message);
    }

    public static DomainException accountInactive(String message) {
        return new DomainException(ErrorCode.ACCOUNT_INACTIVE, message);
    }

    public static DomainException rateLimited(String message, int retryAfterSeconds) {
        return new DomainException(
            ErrorCode.RATE_LIMITED,
            message,
            Map.of("retryAfterSeconds", retryAfterSeconds)
        );
    }
}
