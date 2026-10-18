package dev.handbook;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.handbook.support.MainRunner;
import org.junit.jupiter.api.Test;

class ExamplesIndexTest {

    @Test
    void everyListedExampleHasAMainMethod() {
        for (String name : Examples.EXAMPLES) {
            assertDoesNotThrow(() -> Class.forName(name).getMethod("main", String[].class), name);
        }
    }

    @Test
    void indexPrintsEveryExample() {
        String out = MainRunner.run(Examples.class);
        for (String name : Examples.EXAMPLES) {
            assertTrue(out.contains(name), name);
        }
    }
}
