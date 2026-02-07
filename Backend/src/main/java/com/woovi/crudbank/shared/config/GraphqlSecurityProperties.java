package com.woovi.crudbank.shared.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "crudbank.graphql")
public record GraphqlSecurityProperties(
    @Min(1) int maxDepth,
    @Min(1) int maxComplexity
) {
}
