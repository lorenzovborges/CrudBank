package com.woovi.crudbank.shared.relay;

import com.woovi.crudbank.shared.error.DomainException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Component
public class CursorCodec {

    public String encode(Instant createdAt, String id) {
        String raw = createdAt.toEpochMilli() + ":" + id;
        return Base64.getUrlEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public DecodedCursor decode(String cursor) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int separator = decoded.indexOf(':');
            if (separator <= 0 || separator == decoded.length() - 1) {
                throw DomainException.validation("Invalid cursor format");
            }
            long timestamp = Long.parseLong(decoded.substring(0, separator));
            String id = decoded.substring(separator + 1);
            return new DecodedCursor(Instant.ofEpochMilli(timestamp), id);
        } catch (IllegalArgumentException ex) {
            throw DomainException.validation("Invalid cursor encoding");
        }
    }

    public record DecodedCursor(Instant createdAt, String id) {
    }
}
