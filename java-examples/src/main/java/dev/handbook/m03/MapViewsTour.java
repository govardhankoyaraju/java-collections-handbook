package dev.handbook.m03;

import java.util.Collection;
import java.util.ConcurrentModificationException;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Set;
import java.util.TreeMap;

/**
 * A Map is not a Collection, but it exposes three Collection <em>views</em> that are backed by it.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m03.MapViewsTour}
 */
public final class MapViewsTour {

    private MapViewsTour() {
    }

    public static void main(String[] args) {
        // TreeMap gives a deterministic (sorted) order, which keeps this output reproducible.
        NavigableMap<String, Integer> stock = new TreeMap<>(Map.of(
                "apple", 12, "banana", 0, "cherry", 7, "damson", 0));

        Set<String> keys = stock.keySet();
        Collection<Integer> values = stock.values();
        Set<Map.Entry<String, Integer>> entries = stock.entrySet();
        System.out.println("keys=" + keys + " values=" + values);

        // Views are live: a change to the map is visible through them...
        stock.put("elder", 3);
        System.out.println("after put, keys=" + keys);

        // ...and removal through a view removes the mapping from the map.
        values.removeIf(quantity -> quantity == 0);
        System.out.println("after values.removeIf(q == 0): " + stock);

        // Entry.setValue during iteration writes through to the map.
        for (Map.Entry<String, Integer> e : entries) {
            e.setValue(e.getValue() * 10);
        }
        System.out.println("after setValue x10: " + stock);

        // Views do not support adding: there is no value to pair with a new key.
        try {
            keys.add("fig");
        } catch (UnsupportedOperationException e) {
            System.out.println("keySet().add -> UnsupportedOperationException");
        }

        // Structural change while iterating a view, not through its iterator: fail-fast.
        try {
            for (String key : keys) {
                if (key.startsWith("a")) {
                    stock.remove(key);
                }
            }
        } catch (ConcurrentModificationException e) {
            System.out.println("remove during for-each -> ConcurrentModificationException");
        }

        // Navigation that only a NavigableMap offers.
        System.out.println("ceilingKey(\"c\")=" + stock.ceilingKey("c") + " headMap(\"d\")=" + stock.headMap("d"));
    }
}
