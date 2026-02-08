package com.woovi.crudbank.transaction.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransactionView(
    String id,
    String fromAccountId,
    String toAccountId,
    BigDecimal amount,
    String currency,
    String description,
    String idempotencyKey,
    OffsetDateTime createdAt
) {
}
