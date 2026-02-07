package com.woovi.crudbank.transaction.api;

public record TransactionEdgeView(
    String cursor,
    TransactionView node
) {
}
