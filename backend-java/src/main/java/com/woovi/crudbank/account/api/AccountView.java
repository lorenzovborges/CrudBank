package com.woovi.crudbank.account.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AccountView(
    String id,
    String ownerName,
    String document,
    String branch,
    String number,
    String currency,
    BigDecimal currentBalance,
    String status,
    String version,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}
