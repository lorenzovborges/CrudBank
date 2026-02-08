package com.woovi.crudbank.account.api;

import com.woovi.crudbank.shared.relay.PageInfoView;

import java.util.List;

public record AccountConnectionView(
    List<AccountEdgeView> edges,
    PageInfoView pageInfo
) {
}
