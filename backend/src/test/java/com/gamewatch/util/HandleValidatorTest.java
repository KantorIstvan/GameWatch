package com.gamewatch.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HandleValidatorTest {

    @Test
    void acceptsOrdinaryHandles() {
        assertThat(HandleValidator.rejectionReason("kantor")).isNull();
        assertThat(HandleValidator.rejectionReason("player_one")).isNull();
        assertThat(HandleValidator.rejectionReason("g4mer99")).isNull();
    }

    @Test
    void rejectsHandlesThatCannotBeTypedOrCouldBeSpoofed() {
        // A handle goes in a URL and in mentions. Unicode invites homoglyph impersonation,
        // and punctuation that reads as a path or a file extension invites confusion.
        assertThat(HandleValidator.rejectionReason("kántor")).isNotNull();
        assertThat(HandleValidator.rejectionReason("first.last")).isNotNull();
        assertThat(HandleValidator.rejectionReason("with-hyphen")).isNotNull();
        assertThat(HandleValidator.rejectionReason("has space")).isNotNull();
    }

    @Test
    void rejectsLeadingAndTrailingUnderscores() {
        assertThat(HandleValidator.rejectionReason("_leading")).isNotNull();
        assertThat(HandleValidator.rejectionReason("trailing_")).isNotNull();
        assertThat(HandleValidator.rejectionReason("in_the_middle")).isNull();
    }

    @Test
    void rejectsUppercase() {
        // Stored lowercase and compared case-insensitively, so accepting mixed case here
        // would let two handles that look distinct collide on the unique index.
        assertThat(HandleValidator.rejectionReason("Kantor")).isNotNull();
        assertThat(HandleValidator.normalize("  KANTOR  ")).isEqualTo("kantor");
    }

    @Test
    void rejectsHandlesThatWouldShadowARouteOrImpersonateTheApp() {
        assertThat(HandleValidator.rejectionReason("settings")).isNotNull();
        assertThat(HandleValidator.rejectionReason("admin")).isNotNull();
        assertThat(HandleValidator.rejectionReason("gamewatch")).isNotNull();
        assertThat(HandleValidator.rejectionReason("statistics")).isNotNull();
    }

    @Test
    void enforcesLengthBounds() {
        assertThat(HandleValidator.rejectionReason("ab")).isNotNull();
        assertThat(HandleValidator.rejectionReason("abc")).isNull();
        assertThat(HandleValidator.rejectionReason("a".repeat(30))).isNull();
        assertThat(HandleValidator.rejectionReason("a".repeat(31))).isNotNull();
    }

    @Test
    void rejectsNothingness() {
        assertThat(HandleValidator.rejectionReason(null)).isNotNull();
        assertThat(HandleValidator.rejectionReason("   ")).isNotNull();
    }
}
