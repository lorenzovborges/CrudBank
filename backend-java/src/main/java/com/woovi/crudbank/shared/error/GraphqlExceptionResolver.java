package com.woovi.crudbank.shared.error;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.stereotype.Component;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class GraphqlExceptionResolver extends DataFetcherExceptionResolverAdapter {

    private static final Logger LOGGER = LoggerFactory.getLogger(GraphqlExceptionResolver.class);

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        DomainException domainException = findCause(ex, DomainException.class);
        if (domainException != null) {
            Map<String, Object> extensions = new HashMap<>();
            extensions.put("code", domainException.getCode().name());
            extensions.putAll(domainException.getDetails());
            return GraphqlErrorBuilder.newError(env)
                .message(domainException.getMessage())
                .extensions(extensions)
                .build();
        }

        ConstraintViolationException constraintViolationException = findCause(ex, ConstraintViolationException.class);
        if (constraintViolationException != null) {
            return buildValidationError(env, toConstraintViolations(constraintViolationException));
        }

        BindException bindException = findCause(ex, BindException.class);
        if (bindException != null) {
            return buildValidationError(env, toBindingViolations(bindException));
        }

        LOGGER.error("Unhandled GraphQL exception", ex);
        return GraphqlErrorBuilder.newError(env)
            .message("Unexpected error")
            .extensions(Map.of("code", ErrorCode.INTERNAL_ERROR.name()))
            .build();
    }

    private <T extends Throwable> T findCause(Throwable throwable, Class<T> type) {
        Throwable current = throwable;
        while (current != null) {
            if (type.isInstance(current)) {
                return type.cast(current);
            }
            current = current.getCause();
        }
        return null;
    }

    private GraphQLError buildValidationError(DataFetchingEnvironment env, List<Map<String, String>> violations) {
        Map<String, Object> extensions = new HashMap<>();
        extensions.put("code", ErrorCode.VALIDATION_ERROR.name());
        if (!violations.isEmpty()) {
            extensions.put("violations", violations);
        }

        return GraphqlErrorBuilder.newError(env)
            .message("Please review the highlighted fields.")
            .extensions(extensions)
            .build();
    }

    private List<Map<String, String>> toConstraintViolations(ConstraintViolationException ex) {
        List<Map<String, String>> violations = new ArrayList<>();
        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
            String field = extractFieldName(String.valueOf(violation.getPropertyPath()));
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("field", field);
            entry.put("message", violation.getMessage());
            violations.add(entry);
        }
        return violations;
    }

    private List<Map<String, String>> toBindingViolations(BindException ex) {
        List<Map<String, String>> violations = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("field", extractFieldName(fieldError.getField()));
            entry.put("message", fieldError.getDefaultMessage() == null
                ? "Invalid value"
                : fieldError.getDefaultMessage());
            violations.add(entry);
        }
        return violations;
    }

    private String extractFieldName(String path) {
        if (path == null || path.isBlank()) {
            return "input";
        }
        int lastDot = path.lastIndexOf('.');
        if (lastDot >= 0 && lastDot + 1 < path.length()) {
            return path.substring(lastDot + 1);
        }
        return path;
    }
}
