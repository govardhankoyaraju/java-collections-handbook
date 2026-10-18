package dev.handbook.m07;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.handbook.support.JdkInternals;
import java.util.HashMap;
import java.util.List;
import java.util.SplittableRandom;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Verifies the IMPLEMENTATION DETAILS described in the HashMap lessons against the running JDK
 * (OpenJDK/Temurin 25 in CI). If a future JDK changes them, these tests fail and the lessons must
 * be revised: that is the point.
 */
class HashMapInternalsTest {

    @BeforeEach
    void requireInternals() {
        Assumptions.assumeTrue(JdkInternals.available(), "needs --add-opens java.base/java.util=ALL-UNNAMED");
    }

    @Test
    void spreadAndMaskPredictTheRealBucket() {
        SplittableRandom random = new SplittableRandom(25);
        HashMap<String, Integer> map = new HashMap<>();
        for (int i = 0; i < 200; i++) {
            map.put("key-" + random.nextInt(), i);
        }
        int capacity = JdkInternals.hashMapCapacity(map);
        for (String key : map.keySet()) {
            int index = HashMapIndexing.bucketIndex(HashMapIndexing.spread(key), capacity);
            assertTrue(JdkInternals.bucketKeys(map, index).contains(key), key);
        }
    }

    @Test
    void negativeHashCodesStillProduceValidIndexes() {
        int spread = HashMapIndexing.spread("customer:42");
        assertTrue(spread < 0);
        assertEquals(5, HashMapIndexing.bucketIndex(spread, 16));
        assertThrows(IllegalArgumentException.class, () -> HashMapIndexing.bucketIndex(1, 12));
        assertEquals(0, HashMapIndexing.spread(null));
    }

    @Test
    void defaultThresholdsDoubleWithTheTable() {
        HashMap<Integer, Integer> map = new HashMap<>();
        assertEquals(0, JdkInternals.hashMapCapacity(map));
        for (int i = 0; i < 12; i++) {
            map.put(i, i);
        }
        assertEquals(16, JdkInternals.hashMapCapacity(map));
        assertEquals(12, JdkInternals.hashMapThreshold(map));
        map.put(12, 12); // 13th entry: size 13 > threshold 12
        assertEquals(32, JdkInternals.hashMapCapacity(map));
        assertEquals(24, JdkInternals.hashMapThreshold(map));
    }

    @Test
    void initialCapacityIsRoundedUpToAPowerOfTwo() {
        HashMap<Integer, Integer> map = new HashMap<>(100);
        assertEquals(128, JdkInternals.hashMapThreshold(map)); // stashed until first put
        map.put(1, 1);
        assertEquals(128, JdkInternals.hashMapCapacity(map));
        assertEquals(96, JdkInternals.hashMapThreshold(map));
        HashMap<Integer, Integer> zero = new HashMap<>(0);
        zero.put(1, 1);
        // Pathological: capacity 1 has threshold (int) 0.75 == 0, so the first put allocates a
        // 1-slot table and immediately resizes it to 2.
        assertEquals(2, JdkInternals.hashMapCapacity(zero));
        assertThrows(IllegalArgumentException.class, () -> new HashMap<>(-1));
        assertThrows(IllegalArgumentException.class, () -> new HashMap<>(16, 0f));
        assertThrows(IllegalArgumentException.class, () -> HashMap.newHashMap(-1));
    }

    @Test
    void newHashMapAvoidsResizingForTheExpectedSize() {
        for (int expected : new int[] {1, 12, 13, 100, 1_000}) {
            HashMap<Integer, Integer> map = HashMap.newHashMap(expected);
            for (int i = 0; i < expected; i++) {
                map.put(i, i);
            }
            assertTrue(expected <= JdkInternals.hashMapThreshold(map), "expected=" + expected);
        }
    }

    @Test
    void resizeSplitsABucketIntoLoAndHiPreservingOrder() {
        HashMap<Integer, String> map = new HashMap<>(16);
        for (int key : new int[] {5, 21, 37, 53}) {
            map.put(key, "v");
        }
        assertEquals(List.of(5, 21, 37, 53), JdkInternals.bucketKeys(map, 5));
        for (int k = 200; k < 209; k++) {
            map.put(k, "filler");
        }
        assertEquals(32, JdkInternals.hashMapCapacity(map));
        assertEquals(List.of(5, 37), JdkInternals.bucketKeys(map, 5));    // (hash & 16) == 0 stay
        assertEquals(List.of(21, 53), JdkInternals.bucketKeys(map, 21));  // (hash & 16) != 0 move by 16
    }

    @Test
    void putAppendsToTheTailButComputeIfAbsentInsertsAtTheHead() {
        HashMap<Integer, String> viaPut = new HashMap<>(16);
        viaPut.put(5, "a");
        viaPut.put(21, "b");
        viaPut.put(37, "c");
        assertEquals(List.of(5, 21, 37), JdkInternals.bucketKeys(viaPut, 5));

        HashMap<Integer, String> viaCompute = new HashMap<>(16);
        viaCompute.put(5, "a");
        viaCompute.put(21, "b");
        viaCompute.computeIfAbsent(37, k -> "c");
        assertEquals(List.of(37, 5, 21), JdkInternals.bucketKeys(viaCompute, 5));
    }

    @Test
    void smallTableResizesInsteadOfTreeifying() {
        HashMap<TreeificationDemo.CollidingKey, Integer> map = new HashMap<>();
        for (int i = 1; i <= 8; i++) {
            map.put(new TreeificationDemo.CollidingKey(i), i);
        }
        assertEquals(16, JdkInternals.hashMapCapacity(map));
        map.put(new TreeificationDemo.CollidingKey(9), 9);
        assertEquals(32, JdkInternals.hashMapCapacity(map));
        assertEquals("Node", JdkInternals.bucketNodeType(map, 42 & 31));
        map.put(new TreeificationDemo.CollidingKey(10), 10);
        map.put(new TreeificationDemo.CollidingKey(11), 11);
        assertEquals(64, JdkInternals.hashMapCapacity(map));
        assertEquals("TreeNode", JdkInternals.bucketNodeType(map, 42));
        for (int i = 1; i <= 11; i++) {
            assertEquals(i, map.get(new TreeificationDemo.CollidingKey(i)));
        }
    }

    @Test
    void presizedTableTreeifiesAtTheNinthCollidingEntry() {
        HashMap<TreeificationDemo.CollidingKey, Integer> map = HashMap.newHashMap(64); // table 128
        for (int i = 1; i <= 8; i++) {
            map.put(new TreeificationDemo.CollidingKey(i), i);
        }
        assertEquals("Node", JdkInternals.bucketNodeType(map, 42));
        map.put(new TreeificationDemo.CollidingKey(9), 9);
        assertEquals("TreeNode", JdkInternals.bucketNodeType(map, 42));
    }

    @Test
    void treeBinsWorkEvenForNonComparableCollidingKeys() {
        record Opaque(int id) {
            @Override
            public int hashCode() {
                return 7;
            }
        }
        HashMap<Opaque, Integer> map = HashMap.newHashMap(64);
        for (int i = 0; i < 50; i++) {
            map.put(new Opaque(i), i);
        }
        assertEquals("TreeNode", JdkInternals.bucketNodeType(map, 7));
        for (int i = 0; i < 50; i++) {
            assertEquals(i, map.get(new Opaque(i)));
        }
        for (int i = 0; i < 50; i++) {
            map.remove(new Opaque(i));
        }
        assertTrue(map.isEmpty());
    }

    @Test
    void memoryModelNumbers() {
        assertEquals(32, HashMapMemoryModel.node());
        assertEquals(56, HashMapMemoryModel.treeNode());
        assertEquals(16, HashMapMemoryModel.capacityFor(12));
        assertEquals(32, HashMapMemoryModel.capacityFor(13));
    }
}
