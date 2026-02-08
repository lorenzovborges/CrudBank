package com.woovi.crudbank.transaction.api;

import com.woovi.crudbank.shared.relay.PageInfoView;


public record TransactionConnectionView(
    java.util.List<TransactionEdgeView> edges,
    PageInfoView pageInfo
) {
}
