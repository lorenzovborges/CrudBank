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
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;

import java.lang.reflect.Method;
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
    void shouldResolveWrappedDomainException() {
        RuntimeException wrapped = new RuntimeException("wrapper", DomainException.validation("Invalid input"));
        GraphQLError error = resolver.resolve(wrapped, env);
        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        assertThat(error.getMessage()).isEqualTo("Invalid input");
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

    @Test
    void shouldResolveConstraintViolationWithBlankPathAndNoViolations() {
        @SuppressWarnings("unchecked")
        ConstraintViolation<Object> violation = Mockito.mock(ConstraintViolation.class);
        Path path = Mockito.mock(Path.class);
        Mockito.when(path.toString()).thenReturn("");
        Mockito.when(violation.getPropertyPath()).thenReturn(path);
        Mockito.when(violation.getMessage()).thenReturn("Invalid input");

        GraphQLError error = resolver.resolve(new ConstraintViolationException(Set.of(violation)), env);
        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        Object rawViolations = error.getExtensions().get("violations");
        assertThat(rawViolations).isInstanceOf(Iterable.class);
        @SuppressWarnings("unchecked")
        Map<String, String> first = ((Iterable<Map<String, String>>) rawViolations).iterator().next();
        assertThat(first).containsEntry("field", "input");
    }

    @Test
    void shouldResolveBindException() {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "input");
        bindingResult.addError(new FieldError("input", "payload.ownerName", "must not be blank"));
        BindException bindException = new BindException(bindingResult);

        GraphQLError error = resolver.resolve(bindException, env);

        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        Object rawViolations = error.getExtensions().get("violations");
        assertThat(rawViolations).isInstanceOf(Iterable.class);
        @SuppressWarnings("unchecked")
        Map<String, String> first = ((Iterable<Map<String, String>>) rawViolations).iterator().next();
        assertThat(first).containsEntry("field", "ownerName");
        assertThat(first).containsEntry("message", "must not be blank");
    }

    @Test
    void shouldResolveBindExceptionWithoutDefaultMessage() {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "input");
        bindingResult.addError(new FieldError("input", "payload.amount", null, false, null, null, null));
        BindException bindException = new BindException(bindingResult);

        GraphQLError error = resolver.resolve(bindException, env);

        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        Object rawViolations = error.getExtensions().get("violations");
        assertThat(rawViolations).isInstanceOf(Iterable.class);
        @SuppressWarnings("unchecked")
        Map<String, String> first = ((Iterable<Map<String, String>>) rawViolations).iterator().next();
        assertThat(first).containsEntry("field", "amount");
        assertThat(first).containsEntry("message", "Invalid value");
    }

    @Test
    void shouldResolveConstraintViolationWithoutEntries() {
        GraphQLError error = resolver.resolve(new ConstraintViolationException(Set.of()), env);
        assertThat(error.getExtensions()).containsEntry("code", "VALIDATION_ERROR");
        assertThat(error.getExtensions()).doesNotContainKey("violations");
    }

    @Test
    void shouldExtractFieldNameFromNullAndTrailingDot() throws Exception {
        Method method = GraphqlExceptionResolver.class.getDeclaredMethod("extractFieldName", String.class);
        method.setAccessible(true);

        String fromNull = (String) method.invoke(resolver, new Object[]{null});
        String fromTrailingDot = (String) method.invoke(resolver, "payload.");
        String fromPlainField = (String) method.invoke(resolver, "amount");

        assertThat(fromNull).isEqualTo("input");
        assertThat(fromTrailingDot).isEqualTo("payload.");
        assertThat(fromPlainField).isEqualTo("amount");
    }

    private static class TestableResolver extends GraphqlExceptionResolver {
        GraphQLError resolve(Throwable ex, DataFetchingEnvironment environment) {
            return super.resolveToSingleError(ex, environment);
        }
    }
}
