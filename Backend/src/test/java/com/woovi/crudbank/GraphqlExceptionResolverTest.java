package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.error.ErrorCode;
import com.woovi.crudbank.shared.error.GraphqlExceptionResolver;
import graphql.GraphQLError;
import graphql.execution.ExecutionStepInfo;
import graphql.execution.ResultPath;
import graphql.language.Field;
import graphql.schema.DataFetchingEnvironment;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GraphqlExceptionResolverTest {

    private final TestableResolver resolver = new TestableResolver();
    private DataFetchingEnvironment env;

    @BeforeEach
    void setUp() {
        env = Mockito.mock(DataFetchingEnvironment.class);
        ExecutionStepInfo stepInfo = Mockito.mock(ExecutionStepInfo.class);
        Mockito.when(stepInfo.getPath()).thenReturn(ResultPath.rootPath());
        Mockito.when(env.getExecutionStepInfo()).thenReturn(stepInfo);
        Mockito.when(env.getField()).thenReturn(Field.newField("test").build());
    }

    @Test
    void shouldResolveUnexpectedError() {
        GraphQLError error = resolver.resolve(new RuntimeException("boom"), env);
        assertThat(error.getExtensions()).containsEntry("code", "INTERNAL_ERROR");
    }

    @Test
    void shouldResolveDomainException() {
        DomainException exception = new DomainException(ErrorCode.CONFLICT, "Conflict", Map.of("key", "idempotency"));
        GraphQLError error = resolver.resolve(exception, env);

        assertThat(error.getExtensions()).containsEntry("code", "CONFLICT");
        assertThat(error.getExtensions()).containsEntry("key", "idempotency");
    }

    @Test
    void shouldResolveConstraintViolationException() {
        @SuppressWarnings("unchecked")
        ConstraintViolation<Object> violation = Mockito.mock(ConstraintViolation.class);
        Path path = Mockito.mock(Path.class);
        Mockito.when(path.toString()).thenReturn("transferFunds.input.amount");
        Mockito.when(violation.getPropertyPath()).thenReturn(path);
        Mockito.when(violation.getMessage()).thenReturn("Amount must be greater than zero");

        GraphQLError error = resolver.resolve(new ConstraintViolationException(Set.of(violation)), env);

        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        assertThat(error.getMessage()).isEqualTo("Please review the highlighted fields.");
        Object rawViolations = error.getExtensions().get("violations");
        assertThat(rawViolations).isInstanceOf(Iterable.class);
        @SuppressWarnings("unchecked")
        Map<String, String> first = ((Iterable<Map<String, String>>) rawViolations).iterator().next();
        assertThat(new LinkedHashMap<>(first))
            .containsEntry("field", "amount")
            .containsEntry("message", "Amount must be greater than zero");
    }

    private static class TestableResolver extends GraphqlExceptionResolver {
        GraphQLError resolve(Throwable ex, DataFetchingEnvironment environment) {
            return super.resolveToSingleError(ex, environment);
        }
    }
}
