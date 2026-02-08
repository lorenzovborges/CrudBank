package com.woovi.crudbank.shared.relay;

public record PageInfoView(
    boolean hasNextPage,
    boolean hasPreviousPage,
    String startCursor,
    String endCursor
) {
}
