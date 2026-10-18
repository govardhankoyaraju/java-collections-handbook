package dev.handbook.m02;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ComplexityExamplesTest {

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 16, 17, 1_000, 65_536})
    void binarySearchNeverExceedsFloorLog2PlusOne(int n) {
        int[] sorted = GrowthRates.sortedInput(n);
        int bound = 32 - Integer.numberOfLeadingZeros(n); // floor(log2 n) + 1
        assertTrue(GrowthRates.binarySearchSteps(sorted, -1) <= bound);
        assertTrue(GrowthRates.binarySearchSteps(sorted, 2 * (n - 1)) <= bound);
        assertEquals(1, GrowthRates.binarySearchSteps(sorted, sorted[(n - 1) >>> 1]));
    }

    @Test
    void binarySearchOnEmptyArrayDoesNoWork() {
        assertEquals(0, GrowthRates.binarySearchSteps(new int[0], 5));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 10, 500})
    void allPairsIsNChooseTwo(int n) {
        assertEquals((long) n * (n - 1) / 2, GrowthRates.allPairsComparisons(new int[n]));
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 64, 1_024})
    void mergeSortStaysWithinNLog2N(int n) {
        long log2 = 31 - Integer.numberOfLeadingZeros(n);
        assertTrue(GrowthRates.mergeSortComparisons(GrowthRates.input(n)) <= n * log2);
    }

    @Test
    void duplicateStrategiesAgree() {
        List<String> emails = List.of("a@x", "b@x", "a@x", "c@x", "b@x", "a@x");
        assertEquals(DuplicateDetection.duplicatesNestedLoop(emails).duplicates(),
                DuplicateDetection.duplicatesWithHashSet(emails).duplicates());
        assertEquals(Set.of("a@x", "b@x"), DuplicateDetection.duplicatesWithHashSet(emails).duplicates());
    }

    @Test
    void duplicateDetectionEdgeCases() {
        assertTrue(DuplicateDetection.duplicatesWithHashSet(List.of()).duplicates().isEmpty());
        assertTrue(DuplicateDetection.duplicatesNestedLoop(List.of("only")).duplicates().isEmpty());
        assertEquals(0, DuplicateDetection.duplicatesNestedLoop(List.of("only")).comparisons());
    }

    @Test
    void multiplicativeGrowthIsAmortizedConstant() {
        AmortizedGrowth array = new AmortizedGrowth(AmortizedGrowth.Policy.MULTIPLY_1_5, 1);
        for (int i = 0; i < 200_000; i++) {
            array.add(i);
        }
        assertTrue(array.copies() < 3L * array.size(), "copies=" + array.copies());
        assertEquals(199_999, array.get(199_999));
    }

    @Test
    void additiveGrowthIsQuadratic() {
        AmortizedGrowth array = new AmortizedGrowth(AmortizedGrowth.Policy.ADD_ONE, 1);
        int n = 2_000;
        for (int i = 0; i < n; i++) {
            array.add(i);
        }
        // copies = 1 + 2 + ... + (n - 1)
        assertEquals((long) n * (n - 1) / 2, array.copies());
    }

    @Test
    void growableArrayValidatesArguments() {
        assertThrows(IllegalArgumentException.class, () -> new AmortizedGrowth(AmortizedGrowth.Policy.ADD_ONE, 0));
        AmortizedGrowth array = new AmortizedGrowth(AmortizedGrowth.Policy.ADD_ONE, 4);
        array.add(1);
        assertThrows(IndexOutOfBoundsException.class, () -> array.get(1));
        assertThrows(IndexOutOfBoundsException.class, () -> array.get(-1));
    }

    @Test
    void memoryModelArithmetic() {
        assertEquals(16, MemoryFootprintModel.align(12));
        assertEquals(16, MemoryFootprintModel.integerObject());
        assertEquals(16, MemoryFootprintModel.intArray(0));
        assertEquals(24, MemoryFootprintModel.intArray(1));
        assertTrue(MemoryFootprintModel.linkedListOfInteger(1_000) > MemoryFootprintModel.arrayListOfInteger(1_000));
    }

    @Test
    void indexedLookupMatchesScanAndCountsLinearly() {
        var customers = LookupIndexing.customers(500);
        var orders = LookupIndexing.orders(800, 500);
        var scan = new LookupIndexing.Counter();
        var index = new LookupIndexing.Counter();
        assertEquals(LookupIndexing.enrichByScanning(orders, customers, scan),
                LookupIndexing.enrichWithIndex(orders, customers, index));
        assertEquals(500 + 800, index.value());
    }

    @Test
    void indexRejectsDuplicateIdsAndSkipsUnknownCustomers() {
        var duplicateIds = List.of(new LookupIndexing.Customer(1, "A"), new LookupIndexing.Customer(1, "B"));
        assertThrows(IllegalArgumentException.class,
                () -> LookupIndexing.enrichWithIndex(List.of(), duplicateIds, new LookupIndexing.Counter()));
        var result = LookupIndexing.enrichWithIndex(
                List.of(new LookupIndexing.Order(1, 99)), List.of(new LookupIndexing.Customer(1, "A")),
                new LookupIndexing.Counter());
        assertTrue(result.isEmpty());
    }
}
