package com.woovi.crudbank.ratelimit.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("leaky_bucket_state")
public class LeakyBucketStateDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String subject;

    private double waterLevel;

    private Instant lastLeakAt;

    private Instant updatedAt;

    @Version
    private Long version;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public double getWaterLevel() {
        return waterLevel;
    }

    public void setWaterLevel(double waterLevel) {
        this.waterLevel = waterLevel;
    }

    public Instant getLastLeakAt() {
        return lastLeakAt;
    }

    public void setLastLeakAt(Instant lastLeakAt) {
        this.lastLeakAt = lastLeakAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
