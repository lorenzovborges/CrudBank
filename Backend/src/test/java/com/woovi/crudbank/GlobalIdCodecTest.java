package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.GlobalIdCodec;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GlobalIdCodecTest {

    private final GlobalIdCodec codec = new GlobalIdCodec();

    @Test
    void shouldEncodeAndDecodeGlobalId() {
        String encoded = codec.encode("Account", "abc123");
        var decoded = codec.decode(encoded);

        assertEquals("Account", decoded.type());
        assertEquals("abc123", decoded.id());
    }

    @Test
    void shouldRejectInvalidEncodedGlobalId() {
        assertThrows(DomainException.class, () -> codec.decode("invalid_base64"));
    }

    @Test
    void shouldRejectMalformedDecodedGlobalId() {
        String encoded = java.util.Base64.getUrlEncoder().encodeToString("badformat".getBytes());
        assertThrows(DomainException.class, () -> codec.decode(encoded));
    }

    @Test
    void shouldRejectGlobalIdWithoutIdPart() {
        String encoded = java.util.Base64.getUrlEncoder().encodeToString("Account:".getBytes());
        assertThrows(DomainException.class, () -> codec.decode(encoded));
    }
}
