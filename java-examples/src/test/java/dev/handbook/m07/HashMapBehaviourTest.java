package dev.handbook.m07;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ConcurrentModificationException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;

/** Behaviour guaranteed by the Map/HashMap/LinkedHashMap contracts (no internals involved). */
class HashMapBehaviourTest {

    @Test
    void equalsWithoutHashCodeBreaksLookup() {
        Map<KeyEqualityBug.BrokenAccountKey, String> map = new HashMap<>();
        map.put(new KeyEqualityBug.BrokenAccountKey("B", "1"), "x");
        // Identity hash codes of two distinct objects are equal only by extreme coincidence.
        assertNull(map.get(new KeyEqualityBug.BrokenAccountKey("B", "1")));
        Map<KeyEqualityBug.AccountId, String> ok = new HashMap<>();
        ok.put(new KeyEqualityBug.AccountId("B", "1"), "x");
        assertEquals("x", ok.get(new KeyEqualityBug.AccountId("B", "1")));
        assertThrows(NullPointerException.class, () -> new KeyEqualityBug.AccountId(null, "1"));
    }

    @Test
    void putReturnsPreviousValueAndNullIsAmbiguous() {
        Map<String, String> map = new HashMap<>();
        assertNull(map.put("k", null));
        assertNull(map.put("k", "v"));      // previous value was null, not "absent"
        assertEquals("v", map.put("k", "w"));
        assertNull(map.put(null, "nullKey"));
        assertEquals("nullKey", map.get(null));
        assertTrue(map.containsKey(null));
        assertNull(map.get("missing"));
        assertEquals("dflt", map.getOrDefault("missing", "dflt"));
    }

    @Test
    void mergeComputeAndPutIfAbsentSemantics() {
        Map<String, Long> totals = HashMapOperationsDemo.totals(HashMapOperationsDemo.payments());
        assertEquals(175_000L, totals.get("acme"));
        assertThrows(NullPointerException.class, () -> HashMapOperationsDemo.totalsBroken(HashMapOperationsDemo.payments()));

        Map<String, Integer> m = new HashMap<>();
        assertEquals(1, m.merge("a", 1, Integer::sum));
        assertEquals(3, m.merge("a", 2, Integer::sum));
        assertNull(m.merge("a", 5, (oldV, newV) -> null)); // null result removes
        assertFalse(m.containsKey("a"));
        assertThrows(NullPointerException.class, () -> m.merge("a", null, Integer::sum));

        assertNull(m.compute("x", (k, v) -> null)); // absent + null result: no-op
        assertFalse(m.containsKey("x"));
        assertNull(m.computeIfPresent("x", (k, v) -> 1));
        assertNull(m.computeIfAbsent("y", k -> null));
        assertFalse(m.containsKey("y"));

        m.put("z", null);
        assertEquals(9, m.computeIfAbsent("z", k -> 9)); // null value counts as absent
        assertEquals(9, m.putIfAbsent("z", 1));
    }

    @Test
    void mappingFunctionMustNotModifyTheMap() {
        Map<String, Integer> map = new HashMap<>();
        assertThrows(ConcurrentModificationException.class, () -> map.computeIfAbsent("a", k -> {
            map.put("b", 1);
            return 1;
        }));
    }

    @Test
    void iteratorIsFailFastButIteratorRemoveIsSafe() {
        Map<Integer, String> map = new HashMap<>();
        for (int i = 0; i < 10; i++) {
            map.put(i, "v" + i);
        }
        assertThrows(ConcurrentModificationException.class, () -> {
            for (Integer key : map.keySet()) {
                if (key == 3) {
                    map.remove(key);
                }
            }
        });
        for (Iterator<Map.Entry<Integer, String>> it = map.entrySet().iterator(); it.hasNext(); ) {
            if (it.next().getKey() % 2 == 0) {
                it.remove();
            }
        }
        assertTrue(map.keySet().stream().allMatch(k -> k % 2 == 1));
    }

    @Test
    void mutatedKeyBecomesUnreachable() {
        Map<MutableKeyDemo.MutableSku, Integer> map = new HashMap<>();
        var key = new MutableKeyDemo.MutableSku("A");
        map.put(key, 1);
        key.setCode("B");
        assertNull(map.get(key));
        assertNull(map.get(new MutableKeyDemo.MutableSku("A")));
        assertEquals(1, map.size());
        key.setCode("A"); // restoring the old state makes it reachable again
        assertEquals(1, map.get(key));
    }

    @Test
    void concurrentHashMapMergeIsAtomicPerKey() throws InterruptedException {
        long total = ConcurrentCountingDemo.count(new ConcurrentHashMap<>());
        assertEquals((long) ConcurrentCountingDemo.THREADS * ConcurrentCountingDemo.EVENTS_PER_THREAD, total);
        assertThrows(NullPointerException.class, () -> new ConcurrentHashMap<String, String>().put("k", null));
    }

    @Test
    void lruCacheEvictsLeastRecentlyUsed() {
        LruCache<String, Integer> cache = new LruCache<>(2);
        cache.put("a", 1);
        cache.put("b", 2);
        assertEquals(1, cache.get("a"));
        cache.put("c", 3);
        assertNull(cache.get("b"));
        assertEquals("[a, c]", cache.order());
        cache.put("a", 10); // update counts as access, no eviction
        assertEquals("[c, a]", cache.order());
        assertEquals(1, cache.evictions());
        assertNull(cache.get("missing")); // a miss does not change order
        assertEquals("[c, a]", cache.order());
    }

    @Test
    void lruCacheEdgeCases() {
        assertThrows(IllegalArgumentException.class, () -> new LruCache<String, String>(0));
        LruCache<String, String> one = new LruCache<>(1);
        one.put("a", "1");
        one.put("b", "2");
        assertEquals(1, one.size());
        assertEquals("[b]", one.order());
    }

    @Test
    void insertionOrderIgnoresReinsertionAccessOrderMovesOnGet() {
        Map<String, Integer> insertion = new LinkedHashMap<>();
        insertion.put("b", 1);
        insertion.put("a", 2);
        insertion.put("b", 3);
        assertEquals(List.of("b", "a"), List.copyOf(insertion.keySet()));

        Map<String, Integer> access = new LinkedHashMap<>(16, 0.75f, true);
        access.put("b", 1);
        access.put("a", 2);
        access.get("b");
        assertEquals(List.of("a", "b"), List.copyOf(access.keySet()));
        access.getOrDefault("a", 0);
        assertEquals(List.of("b", "a"), List.copyOf(access.keySet()));
        access.containsKey("b"); // containsKey is not an access
        assertEquals(List.of("b", "a"), List.copyOf(access.keySet()));
    }

    @Test
    void putFirstOnAnEvictingMapEvictsTheEntryJustInserted() {
        // IMPLEMENTATION BEHAVIOUR (JDK 21-25): removeEldestEntry receives the head of the list,
        // and putFirst has just made the new entry the head.
        Map<String, Integer> lru = new LinkedHashMap<>(16, 0.75f, true) {
            private static final long serialVersionUID = 1L;

            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Integer> eldest) {
                return size() > 2;
            }
        };
        lru.put("a", 1);
        lru.put("b", 2);
        ((LinkedHashMap<String, Integer>) lru).putFirst("c", 3);
        assertEquals(List.of("a", "b"), List.copyOf(lru.keySet()));
    }
}
