package com.woovi.crudbank;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.tester.AutoConfigureHttpGraphQlTester;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.graphql.test.tester.HttpGraphQlTester;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;

import java.util.Map;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureHttpGraphQlTester
public abstract class AbstractGraphqlIntegrationTest {

    static final MongoDBContainer MONGO_DB_CONTAINER;

    static {
        MONGO_DB_CONTAINER = new MongoDBContainer("mongo:7.0");
        MONGO_DB_CONTAINER.start();
    }

    @DynamicPropertySource
    static void dynamicPropertySource(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", MONGO_DB_CONTAINER::getReplicaSetUrl);
        registry.add("crudbank.seed.enabled", () -> false);
        registry.add("crudbank.rate-limit.capacity", () -> 100);
        registry.add("crudbank.rate-limit.leak-per-second", () -> 100.0);
        registry.add("crudbank.idempotency.ttl-hours", () -> 24);
    }

    @Autowired
    protected HttpGraphQlTester graphQlTester;

    @Autowired
    private MongoTemplate mongoTemplate;

    @BeforeEach
    void setUpDatabase() {
        mongoTemplate.getDb().drop();
    }

    @AfterEach
    void cleanDatabase() {
        mongoTemplate.getDb().drop();
    }

    protected String createAccount(String ownerName, String document, String branch, String number, String initialBalance) {
        String mutation = """
            mutation CreateAccount($input: CreateAccountInput!) {
              createAccount(input: $input) {
                id
              }
            }
            """;

        return graphQlTester
            .document(mutation)
            .variable("input", Map.of(
                "ownerName", ownerName,
                "document", document,
                "branch", branch,
                "number", number,
                "initialBalance", initialBalance
            ))
            .execute()
            .path("createAccount.id")
            .entity(String.class)
            .get();
    }
}
