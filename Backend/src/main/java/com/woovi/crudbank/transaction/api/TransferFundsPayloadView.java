package com.woovi.crudbank.transaction.api;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransferFundsPayloadView(
    TransactionView transaction,
    BigDecimal fromAccountBalance,
    BigDecimal toAccountBalance,
    boolean idempotentReplay,
    OffsetDateTime processedAt
) {
}
