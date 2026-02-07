package com.woovi.crudbank.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "crudbank.cors")
public record CorsProperties(String allowedOrigins) {
}
