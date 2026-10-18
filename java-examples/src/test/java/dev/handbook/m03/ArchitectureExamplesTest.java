package dev.handbook.m03;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.SequencedMap;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

class ArchitectureExamplesTest {

    @Test
    void mapIsNotACollectionButLinkedHashMapIsSequenced() {
        Object map = new HashMap<String, String>();
        assertFalse(map instanceof Collection<?>);
        assertEquals("Map", HierarchyTour.interfacesOf(map));
        assertEquals("Map, SequencedMap", HierarchyTour.interfacesOf(new LinkedHashMap<>()));
        assertTrue(HierarchyTour.interfacesOf(new TreeMap<>()).endsWith("NavigableMap"));
    }

    @Test
    void probeReportsReturnValuesAndExceptionTypes() {
        assertEquals("returns true", ContractProbe.probe(() -> true));
        assertEquals("throws IllegalStateException", ContractProbe.probe(() -> {
            throw new IllegalStateException();
        }));
    }

    @Test
    void immutableFactoriesRejectNullsAndDuplicates() {
        assertThrows(NullPointerException.class, () -> List.of("a", null));
        assertThrows(IllegalArgumentException.class, () -> java.util.Set.of("a", "a"));
        assertThrows(IllegalArgumentException.class, () -> Map.of("k", 1, "k", 2));
        assertThrows(UnsupportedOperationException.class, () -> List.of("a").add("b"));
    }

    @Test
    void reversedListIsAWriteThroughView() {
        List<String> steps = new ArrayList<>(List.of("a", "b"));
        List<String> reversed = steps.reversed();
        reversed.addFirst("z");
        assertEquals(List.of("a", "b", "z"), steps);
        steps.add("tail");
        assertEquals("tail", reversed.getFirst());
    }

    @Test
    void sequencedSetPositioningRules() {
        var tags = new LinkedHashSet<>(List.of("a", "b", "c"));
        tags.addFirst("c");
        assertEquals(List.of("c", "a", "b"), List.copyOf(tags));
        tags.addLast("c");
        assertEquals(List.of("a", "b", "c"), List.copyOf(tags));
        assertThrows(UnsupportedOperationException.class, () -> new TreeSet<>(List.of("a")).addFirst("b"));
        assertThrows(NoSuchElementException.class, () -> new ArrayList<String>().getLast());
    }

    @Test
    void sequencedMapSnapshotsAndUnmodifiableView() {
        SequencedMap<String, Integer> map = new LinkedHashMap<>();
        map.put("a", 1);
        map.put("b", 2);
        var first = map.firstEntry();
        assertThrows(UnsupportedOperationException.class, () -> first.setValue(10));
        assertEquals(Map.entry("b", 2), map.pollLastEntry());
        var readOnly = Collections.unmodifiableSequencedMap(map);
        assertThrows(UnsupportedOperationException.class, () -> readOnly.putFirst("z", 0));
        assertEquals(null, new LinkedHashMap<String, Integer>().firstEntry());
    }

    @Test
    void mapViewsAreBackedByTheMap() {
        Map<String, Integer> map = new TreeMap<>(Map.of("a", 1, "b", 0));
        map.values().removeIf(v -> v == 0);
        assertEquals(Map.of("a", 1), map);
        map.keySet().remove("a");
        assertTrue(map.isEmpty());
        assertThrows(UnsupportedOperationException.class, () -> map.keySet().add("x"));
    }

    @Test
    void entrySetRemoveIfIsTheSafeWayToFilterAMap() {
        Map<String, Integer> map = new HashMap<>(Map.of("a", 1, "b", 2, "c", 3));
        map.entrySet().removeIf(e -> e.getValue() % 2 == 1);
        assertEquals(Map.of("b", 2), map);
    }
}
