package com.woovi.crudbank;

import com.woovi.crudbank.shared.error.DomainException;
import com.woovi.crudbank.shared.relay.CursorCodec;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CursorCodecTest {

    private final CursorCodec codec = new CursorCodec();

    @Test
    void shouldEncodeAndDecodeCursor() {
        Instant now = Instant.now();
        String encoded = codec.encode(now, "id-1");
        CursorCodec.DecodedCursor decoded = codec.decode(encoded);

        assertEquals(now.toEpochMilli(), decoded.createdAt().toEpochMilli());
        assertEquals("id-1", decoded.id());
    }

    @Test
    void shouldRejectInvalidCursorEncoding() {
        assertThrows(DomainException.class, () -> codec.decode("%invalid%"));
    }

    @Test
    void shouldRejectMalformedCursor() {
        String encoded = java.util.Base64.getUrlEncoder().encodeToString("badcursor".getBytes());
        assertThrows(DomainException.class, () -> codec.decode(encoded));
    }

    @Test
    void shouldRejectCursorWithoutIdPart() {
        String encoded = java.util.Base64.getUrlEncoder().encodeToString("123:".getBytes());
        assertThrows(DomainException.class, () -> codec.decode(encoded));
    }
}
