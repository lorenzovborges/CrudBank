package com.woovi.crudbank.shared.relay;

import com.woovi.crudbank.shared.error.DomainException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class GlobalIdCodec {

    public String encode(String type, String id) {
        String raw = type + ":" + id;
        return Base64.getUrlEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public DecodedGlobalId decode(String globalId) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(globalId), StandardCharsets.UTF_8);
            int separator = decoded.indexOf(':');
            if (separator <= 0 || separator == decoded.length() - 1) {
                throw DomainException.validation("Invalid global id format");
            }
            return new DecodedGlobalId(
                decoded.substring(0, separator),
                decoded.substring(separator + 1)
            );
        } catch (IllegalArgumentException ex) {
            throw DomainException.validation("Invalid global id encoding");
        }
    }

    public record DecodedGlobalId(String type, String id) {
    }
}
