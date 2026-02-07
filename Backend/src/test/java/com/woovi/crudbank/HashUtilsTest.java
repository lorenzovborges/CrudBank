package com.woovi.crudbank;

import com.woovi.crudbank.shared.util.HashUtils;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HashUtilsTest {

    @Test
    void shouldGenerateDeterministicSha256Hash() {
        String hash1 = HashUtils.sha256Hex("abc");
        String hash2 = HashUtils.sha256Hex("abc");

        assertThat(hash1).isEqualTo(hash2);
        assertThat(hash1).hasSize(64);
    }
}
