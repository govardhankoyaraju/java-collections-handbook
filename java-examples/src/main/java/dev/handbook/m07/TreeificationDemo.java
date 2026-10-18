package dev.handbook.m07;

import dev.handbook.support.JdkInternals;
import java.util.HashMap;

/**
 * Forces every key into one bucket to show when OpenJDK converts a bin to a red-black tree.
 *
 * <p>Rules in OpenJDK 8–25 (implementation details): a bin is treeified when a chain would reach
 * {@code TREEIFY_THRESHOLD + 1 = 9} nodes AND the table has at least
 * {@code MIN_TREEIFY_CAPACITY = 64} slots; with a smaller table, HashMap resizes instead.
 *
 * <p>Run: {@code ./gradlew run -PmainClass=dev.handbook.m07.TreeificationDemo}
 */
public final class TreeificationDemo {

    private TreeificationDemo() {
    }

    /** Every instance has the same hash code. Comparable, so a tree bin can order them. */
    public record CollidingKey(int id) implements Comparable<CollidingKey> {
        @Override
        public int hashCode() {
            return 42;
        }

        @Override
        public int compareTo(CollidingKey other) {
            return Integer.compare(id, other.id);
        }
    }

    public static void main(String[] args) {
        if (!JdkInternals.available()) {
            System.out.println("Run with --add-opens java.base/java.util=ALL-UNNAMED to observe bins.");
            return;
        }
        HashMap<CollidingKey, Integer> map = new HashMap<>();
        for (int i = 1; i <= 11; i++) {
            map.put(new CollidingKey(i), i);
            int capacity = JdkInternals.hashMapCapacity(map);
            int bucket = HashMapIndexing.bucketIndex(HashMapIndexing.spread(new CollidingKey(0)), capacity);
            System.out.printf("size=%-3d table=%-3d bucket %-2d node type=%s%n",
                    map.size(), capacity, bucket, JdkInternals.bucketNodeType(map, bucket));
        }
        System.out.println("lookup still correct: " + map.get(new CollidingKey(7)));
    }
}
