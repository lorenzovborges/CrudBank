package com.woovi.crudbank.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;

@Validated
@ConfigurationProperties(prefix = "crudbank.seed")
public record SeedProperties(
    boolean enabled,
    BigDecimal defaultAccountBalance
) {
}
