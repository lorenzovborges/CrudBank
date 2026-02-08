package com.woovi.crudbank.transaction.api;

import com.woovi.crudbank.transaction.domain.RecentTransactionType;

public record RecentTransactionView(
    TransactionView transaction,
    RecentTransactionType type
) {
}
