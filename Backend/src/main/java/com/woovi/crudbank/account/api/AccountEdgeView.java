package com.woovi.crudbank.account.api;

public record AccountEdgeView(
    String cursor,
    AccountView node
) {
}
