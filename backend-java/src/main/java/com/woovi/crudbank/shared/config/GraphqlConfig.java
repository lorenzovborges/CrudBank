package com.woovi.crudbank.shared.config;

import graphql.analysis.MaxQueryComplexityInstrumentation;
import graphql.analysis.MaxQueryDepthInstrumentation;
import org.springframework.boot.autoconfigure.graphql.GraphQlSourceBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class GraphqlConfig {

    @Bean
    GraphQlSourceBuilderCustomizer graphQlSourceBuilderCustomizer(GraphqlSecurityProperties graphqlSecurityProperties) {
        return builder -> builder.instrumentation(List.of(
            new MaxQueryDepthInstrumentation(graphqlSecurityProperties.maxDepth()),
            new MaxQueryComplexityInstrumentation(graphqlSecurityProperties.maxComplexity())
        ));
    }
}
