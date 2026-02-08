package com.woovi.crudbank.shared.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "crudbank.rate-limit")
public record RateLimitProperties(
    @Min(1) int capacity,
    @Positive double leakPerSecond
) {
}
