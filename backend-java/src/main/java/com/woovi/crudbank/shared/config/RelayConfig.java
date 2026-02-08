package com.woovi.crudbank.shared.config;

import com.woovi.crudbank.account.api.AccountView;
import com.woovi.crudbank.transaction.api.TransactionView;
import graphql.TypeResolutionEnvironment;
import graphql.schema.GraphQLObjectType;
import graphql.schema.TypeResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

@Configuration
public class RelayConfig {

    @Bean
    RuntimeWiringConfigurer relayRuntimeWiringConfigurer() {
        TypeResolver nodeTypeResolver = this::resolveNodeType;
        return wiringBuilder -> wiringBuilder.type("Node", typeWiring -> typeWiring.typeResolver(nodeTypeResolver));
    }

    private GraphQLObjectType resolveNodeType(TypeResolutionEnvironment environment) {
        Object object = environment.getObject();
        if (object instanceof AccountView) {
            return environment.getSchema().getObjectType("Account");
        }
        if (object instanceof TransactionView) {
            return environment.getSchema().getObjectType("Transaction");
        }
        return null;
    }
}
