package dev.handbook;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dev.handbook.support.MainRunner;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Every deterministic example's output is checked against
 * {@code src/test/resources/expected-output/<Class>.txt}. The website shows those same files as
 * "Expected output", so the handbook never displays output that a real JVM did not produce.
 *
 * <p>ConcurrentCountingDemo is excluded on purpose: its output is nondeterministic.
 */
class ExpectedOutputTest {

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {
        "dev.handbook.m02.GrowthRates",
        "dev.handbook.m02.DuplicateDetection",
        "dev.handbook.m02.AmortizedGrowth",
        "dev.handbook.m02.MemoryFootprintModel",
        "dev.handbook.m02.LookupIndexing",
        "dev.handbook.m03.HierarchyTour",
        "dev.handbook.m03.ContractProbe",
        "dev.handbook.m03.SequencedTour",
        "dev.handbook.m03.MapViewsTour",
        "dev.handbook.m05.ArrayListGrowthDemo",
        "dev.handbook.m05.ListRemovalPitfalls",
        "dev.handbook.m05.LinkedListTraversalModel",
        "dev.handbook.m07.HashMapIndexing",
        "dev.handbook.m07.KeyEqualityBug",
        "dev.handbook.m07.HashMapResizeDemo",
        "dev.handbook.m07.TreeificationDemo",
        "dev.handbook.m07.HashMapOperationsDemo",
        "dev.handbook.m07.MutableKeyDemo",
        "dev.handbook.m07.HashMapMemoryModel",
        "dev.handbook.m07.LruCacheDemo",
    })
    void outputMatchesExpectedFile(String className) throws ClassNotFoundException {
        Class<?> example = Class.forName(className);
        assertEquals(MainRunner.expected(example), MainRunner.run(example));
    }
}
