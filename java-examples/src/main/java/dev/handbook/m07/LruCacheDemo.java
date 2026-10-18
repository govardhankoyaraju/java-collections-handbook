package dev.handbook.m07;

import java.util.ConcurrentModificationException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Insertion order vs access order in LinkedHashMap, and the LRU cache built on access order.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.LruCacheDemo}
 */
public final class LruCacheDemo {

    private LruCacheDemo() {
    }

    public static void main(String[] args) {
        Map<String, Integer> insertion = new LinkedHashMap<>();
        insertion.put("c", 3);
        insertion.put("a", 1);
        insertion.put("b", 2);
        insertion.put("c", 30); // re-inserting an existing key does NOT move it
        insertion.get("a");     // reads do not move entries in insertion-order mode
        System.out.println("insertion order: " + insertion);

        Map<String, Integer> access = new LinkedHashMap<>(16, 0.75f, true);
        access.put("c", 3);
        access.put("a", 1);
        access.put("b", 2);
        access.get("c");        // c becomes most recently used (moves to the tail)
        System.out.println("access order:    " + access);

        LruCache<String, String> cache = new LruCache<>(3);
        cache.put("user:1", "Asha");
        cache.put("user:2", "Ravi");
        cache.put("user:3", "Meera");
        System.out.println("cache:           " + cache.order());
        cache.get("user:1");            // touch user:1
        cache.put("user:4", "Kiran");   // evicts the least recently used: user:2
        System.out.println("after get(user:1), put(user:4): " + cache.order()
                + " evictions=" + cache.evictions() + " user:2=" + cache.get("user:2"));

        try {
            for (String key : access.keySet()) {
                access.get(key);        // a structural modification in access-order mode
            }
        } catch (ConcurrentModificationException e) {
            System.out.println("get() while iterating an access-ordered map -> ConcurrentModificationException");
        }
    }
}
