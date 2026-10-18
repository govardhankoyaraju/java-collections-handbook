package dev.handbook.m05;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.handbook.support.JdkInternals;
import java.util.ArrayList;
import java.util.ConcurrentModificationException;
import java.util.List;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ListExamplesTest {

    @BeforeEach
    void requireInternals() {
        Assumptions.assumeTrue(JdkInternals.available(), "needs --add-opens java.base/java.util=ALL-UNNAMED");
    }

    /** IMPLEMENTATION DETAIL: verifies the growth model against the running JDK's ArrayList. */
    @ParameterizedTest
    @ValueSource(ints = {0, 1, 5, 10})
    void growthModelMatchesRunningJdk(int initialCapacity) {
        ArrayList<Integer> list = new ArrayList<>(initialCapacity);
        List<Integer> observed = new ArrayList<>();
        observed.add(JdkInternals.arrayListCapacity(list));
        for (int i = 0; i < 5_000; i++) {
            list.add(i);
            int c = JdkInternals.arrayListCapacity(list);
            if (c != observed.getLast()) {
                observed.add(c);
            }
        }
        List<Integer> model = ArrayListGrowthModel.capacitiesForAppends(5_000, initialCapacity, false);
        assertEquals(model, observed);
    }

    @Test
    void defaultConstructedListAllocatesTenOnFirstAdd() {
        ArrayList<String> list = new ArrayList<>();
        assertEquals(0, JdkInternals.arrayListCapacity(list));
        list.add("a");
        assertEquals(10, JdkInternals.arrayListCapacity(list));
        assertEquals(List.of(0, 10, 15, 22, 33), ArrayListGrowthModel.capacitiesForAppends(23, 0, true));
    }

    @Test
    void addAllGrowsOnceToMaxOfNeededAndHalf() {
        ArrayList<Integer> list = new ArrayList<>(10);
        list.addAll(java.util.Collections.nCopies(11, 7)); // needs 11, preferred 10 + 5
        assertEquals(15, JdkInternals.arrayListCapacity(list));
        list.addAll(java.util.Collections.nCopies(100, 7)); // needs 111 > 15 + 7
        assertEquals(111, JdkInternals.arrayListCapacity(list));
        assertEquals(111, ArrayListGrowthModel.grow(15, 111, false));
    }

    @Test
    void ensureCapacityAndTrimToSize() {
        ArrayList<Integer> list = new ArrayList<>();
        list.ensureCapacity(5); // no-op for a pristine default list: the first add allocates 10 anyway
        assertEquals(0, JdkInternals.arrayListCapacity(list));
        list.ensureCapacity(500);
        assertEquals(500, JdkInternals.arrayListCapacity(list));
        list.add(1);
        list.trimToSize();
        assertEquals(1, JdkInternals.arrayListCapacity(list));
        list.clear();
        list.trimToSize();
        assertEquals(0, JdkInternals.arrayListCapacity(list));
    }

    @Test
    void removeShiftsTailAndNullsLastSlot() {
        ArrayList<String> list = new ArrayList<>(List.of("a", "b", "c", "d"));
        assertEquals("b", list.remove(1));
        assertEquals(List.of("a", "c", "d"), list);
        assertTrue(list.remove("d"));
        assertThrows(IndexOutOfBoundsException.class, () -> list.get(2));
    }

    @Test
    void removalPitfalls() {
        assertEquals(List.of("INV-1", "INV-3", "INV-4"),
                ListRemovalPitfalls.removeCancelledByIndexBuggy(ListRemovalPitfalls.sample())
                        .stream().map(ListRemovalPitfalls.Invoice::id).toList());
        assertThrows(ConcurrentModificationException.class,
                () -> ListRemovalPitfalls.removeCancelledInForEach(ListRemovalPitfalls.sample()));
        assertEquals(ListRemovalPitfalls.removeCancelledWithIterator(ListRemovalPitfalls.sample()),
                ListRemovalPitfalls.removeCancelledWithRemoveIf(ListRemovalPitfalls.sample()));
    }

    @Test
    void forEachRemovalOfSecondToLastElementDoesNotThrow() {
        // The famous blind spot of fail-fast iteration: hasNext() returns false before next() checks.
        List<String> list = new ArrayList<>(List.of("a", "b", "c"));
        for (String s : list) {
            if (s.equals("b")) {
                list.remove(s);
            }
        }
        assertEquals(List.of("a", "c"), list);
    }

    @Test
    void linkedListHopModel() {
        assertEquals(0, LinkedListTraversalModel.hopsForGet(0, 10));
        assertEquals(0, LinkedListTraversalModel.hopsForGet(9, 10));
        assertEquals(4, LinkedListTraversalModel.hopsForGet(4, 10));
        assertEquals(4, LinkedListTraversalModel.hopsForGet(5, 10));
        assertEquals(0, LinkedListTraversalModel.hopsForGet(0, 1));
        assertThrows(IndexOutOfBoundsException.class, () -> LinkedListTraversalModel.hopsForGet(10, 10));
        assertEquals(0, LinkedListTraversalModel.hopsForIndexedLoop(0));
        long n = 10_000;
        long hops = LinkedListTraversalModel.hopsForIndexedLoop((int) n);
        assertTrue(hops >= n * n / 4 - n && hops <= n * n / 4, "hops=" + hops);
    }
}
