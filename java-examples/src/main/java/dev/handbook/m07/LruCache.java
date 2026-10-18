package dev.handbook.m07;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A bounded least-recently-used cache built on {@link LinkedHashMap} in access order.
 *
 * <p><strong>Not thread-safe.</strong> In access-order mode even {@code get} reorders the internal
 * linked list (a structural modification), so concurrent readers corrupt it just like writers.
 * Wrap with external locking, or use a purpose-built cache library for shared caches.
 *
 * @param <K> key type (should have stable equals/hashCode)
 * @param <V> value type
 */
public final class LruCache<K, V> {

    private final int maxEntries;
    private final Map<K, V> map;
    private long evictions;

    public LruCache(int maxEntries) {
        if (maxEntries < 1) {
            throw new IllegalArgumentException("maxEntries must be positive: " + maxEntries);
        }
        this.maxEntries = maxEntries;
        // initialCapacity sized so the table never resizes; loadFactor 0.75; accessOrder = true
        this.map = new EvictingMap((int) Math.ceil(maxEntries / 0.75));
    }

    /** Composition instead of subclassing keeps LinkedHashMap's wide API out of our public API. */
    private final class EvictingMap extends LinkedHashMap<K, V> {
        private static final long serialVersionUID = 1L;

        EvictingMap(int initialCapacity) {
            super(initialCapacity, 0.75f, true);
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            boolean evict = size() > maxEntries;
            if (evict) {
                evictions++;
            }
            return evict;
        }
    }

    /** Returns the cached value and marks the entry as most recently used, or null if absent. */
    public V get(K key) {
        return map.get(key);
    }

    /** Inserts or replaces; may evict the least recently used entry. */
    public void put(K key, V value) {
        map.put(key, value);
    }

    public int size() {
        return map.size();
    }

    public long evictions() {
        return evictions;
    }

    /** Keys from least to most recently used. Reading keySet does not count as access. */
    public String order() {
        return map.keySet().toString();
    }
}
